import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const migration=readFileSync('supabase/migrations/20261122120240_foundation.sql','utf8');
test('database enforces one category listing per business',()=>assert.match(migration,/primary key \(business_id,category_id\)/));
test('financial tables have RLS and no browser write policies',()=>{for(const table of ['payments','ranking_ledger']){assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security`));assert.doesNotMatch(migration,new RegExp(`on public\\.${table} for (insert|update|delete)`));}});
test('business approval requires admin and records an audit reason',()=>{assert.match(migration,/role='admin'/);assert.match(migration,/insert into audit_logs\(actor_id,action,subject_id,reason\)/)});
test('all 44 required categories are seeded',()=>{const names=migration.split('insert into public.categories(name) values')[1].match(/\('[^']+'\)/g);assert.equal(names.length,44);assert.equal(new Set(names).size,44)});

test('category management is admin-only and audited',()=>{const sql=readFileSync('supabase/migrations/20261122120327_category_and_notifications.sql','utf8');assert.match(sql,/role = 'admin'/);assert.match(sql,/insert into public\.audit_logs/);assert.match(sql,/user_id = auth\.uid\(\)/)});
test('anonymous execution is explicitly revoked for private functions',()=>{const sql=readFileSync('supabase/migrations/20261122120451_restrict_private_function_execution.sql','utf8');for(const name of ['submit_business','review_business','manage_category','mark_notification_read'])assert.match(sql,new RegExp(`revoke execute on function public\\.${name}\\([^;]+ from anon;`))});
