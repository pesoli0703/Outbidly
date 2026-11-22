import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

// An in-memory PostgreSQL instance with minimal Supabase auth/storage stubs.
// It is intentionally isolated from the connected Supabase project.
async function setup() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner_id text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;
    grant usage on schema public, storage to anon,authenticated,service_role;
    grant select,insert on storage.objects to authenticated;
    alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated,service_role;
  `);
  const migrations = ['20261122120240_foundation.sql','20261122120327_category_and_notifications.sql','20261122120451_restrict_private_function_execution.sql','20261122132649_business_privacy_and_validation.sql','20261123000001_sandbox_payment_intents.sql'];
  for (const name of migrations) {
    const sql = await readFile(`supabase/migrations/${name}`, 'utf8');
    // gen_random_uuid() is built into PostgreSQL; PGlite does not ship pgcrypto.
    await db.exec(sql.replace('create extension if not exists pgcrypto;', ''));
  }
  return db;
}
const owner='10000000-0000-4000-8000-000000000001', other='10000000-0000-4000-8000-000000000002', admin='10000000-0000-4000-8000-000000000003';
const approved='20000000-0000-4000-8000-000000000001', pending='20000000-0000-4000-8000-000000000002';
async function become(db,role,user='') {await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub', $1, false)",[user]);await db.exec(`set role ${role}`);}
async function fixture(db) {
  await db.query('insert into auth.users(id) values ($1),($2),($3)',[owner,other,admin]);
  await db.query("insert into public.user_roles values ($1,'admin')",[admin]);
  const {rows:[category]}=await db.query("select id from public.categories where name='Fashion Designers'");
  await db.query(`insert into public.businesses(id,owner_id,name,slug,description,country,city,address,business_type,contact_name,email,phone,logo_url,status)
    values ($1,$3,'Approved','approved','Description','Nigeria','Lagos','Somewhere','Other','Private Name','biz@example.test','+2341234567890','logo','approved'),
           ($2,$3,'Pending','pending','Description','Nigeria','Lagos','Somewhere','Other','Private Name','biz@example.test','+2341234567890','logo','pending')`,[approved,pending,owner]);
  await db.query('insert into public.business_categories values ($1,$3),($2,$3)',[approved,pending,category.id]);
  return category.id;
}

test('database privacy and sandbox payment permissions, validation and replay', async () => {
  const db=await setup();
  try {
    const category=await fixture(db);
    const logo = `${owner}/30000000-0000-4000-8000-000000000001`;
    await db.query("insert into storage.objects(bucket_id,name,owner_id) values('business-logos',$1,$2)",[logo,owner]);
    await become(db,'authenticated',owner);
    const submit = args => db.query('select public.submit_business($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',args);
    const details = ['New business','new-business','Useful business','Nigeria','Lagos','Address','Other','Private contact','contact@example.test','+2341234567890',null,logo,['Fashion Designers']];
    for (const [index,value] of [[0,null],[6,null],[9,'no-phone'],[11,`${other}/30000000-0000-4000-8000-000000000001`],[12,null],[12,['Fashion Designers','Fashion Designers']]]) {
      const invalid=[...details]; invalid[index]=value; await assert.rejects(submit(invalid));
    }
    const submitted=(await submit(details)).rows[0].submit_business;
    assert.equal((await db.query('select status from public.businesses where id=$1',[submitted])).rows[0].status,'pending');
    await assert.rejects(db.query("select public.review_business($1,'approved','owner cannot approve')",[submitted]));
    await become(db,'authenticated',admin);
    await assert.rejects(db.query("select public.review_business($1,'approved',null)",[submitted]));
    await db.query("select public.review_business($1,'approved','Reviewed')",[submitted]);
    await become(db,'anon');
    assert.equal((await db.query('select name from public.public_businesses')).rows.length,2);
    assert.equal((await db.query('select * from public.businesses')).rows.length,0);
    await assert.rejects(db.query('select contact_name from public.public_businesses'));
    await assert.rejects(db.query('select * from public.sandbox_payment_intents'));
    await assert.rejects(db.query('select public.create_sandbox_payment_intent($1,$2,2000,true)',[approved,category]));
    await become(db,'authenticated',other);
    await assert.rejects(db.query('select * from public.create_sandbox_payment_intent($1,$2,2000,true)',[approved,category]));
    assert.equal((await db.query('select * from public.businesses')).rows.length,0);
    await become(db,'authenticated',owner);
    assert.equal((await db.query('select * from public.businesses')).rows.length,3);
    for (const [business,amount,accepted] of [[pending,'2000',true],[approved,'1999.99',true],[approved,'2000',false],[approved,'2000.001',true],[approved,'NaN',true]]) {
      await assert.rejects(db.query('select * from public.create_sandbox_payment_intent($1,$2,$3,$4)',[business,category,amount,accepted]));
    }
    const {rows:[intent]}=await db.query('select * from public.create_sandbox_payment_intent($1,$2,$3,true)',[approved,category,'2000.00']);
    assert.equal(intent.currency,'NGN');
    await become(db,'authenticated',other);
    assert.equal((await db.query('select * from public.sandbox_payment_intents')).rows.length,0);
    await become(db,'authenticated',owner);
    await assert.rejects(db.query('select public.confirm_sandbox_payment_intent($1,$2,$3,$4)',[intent.reference,'123','2000','NGN']));
    await assert.rejects(db.query("update public.sandbox_payment_intents set status='verified'"));
    await become(db,'service_role');
    await assert.rejects(db.query('select public.confirm_sandbox_payment_intent($1,$2,$3,$4)',[intent.reference,'123','2000.01','NGN']));
    await db.query('select public.confirm_sandbox_payment_intent($1,$2,$3,$4)',[intent.reference,'123','2000','NGN']);
    await db.query('select public.confirm_sandbox_payment_intent($1,$2,$3,$4)',[intent.reference,'123','2000','NGN']);
    await assert.rejects(db.query('select public.confirm_sandbox_payment_intent($1,$2,$3,$4)',[intent.reference,'124','2000','NGN']));
    await become(db,'authenticated',owner);
    const {rows:[topup]}=await db.query('select * from public.create_sandbox_payment_intent($1,$2,$3,true)',[approved,category,'500']);
    assert.ok(topup.reference);
    await become(db,'service_role');
    await assert.rejects(db.query('select public.confirm_sandbox_payment_intent($1,$2,$3,$4)',[topup.reference,'123','500','NGN']));
    await db.exec('reset role');
    assert.equal((await db.query('select * from public.ranking_ledger')).rows.length,0);
    assert.equal((await db.query('select * from public.payments')).rows.length,0);
  } finally {await db.close();}
});
