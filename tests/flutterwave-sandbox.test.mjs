import test from 'node:test';
import assert from 'node:assert/strict';
import {createSandboxFlutterwave,processSandboxWebhook} from '../lib/payments/flutterwave-sandbox.mjs';
const reference = 'outbidly-test-12345678-1234-1234-1234-123456789abc';
const key = 'FLWSECK_TEST-fake-key';
const expected = {reference,amount:'2000.00',currency:'NGN'};
const event = {event:'charge.completed',data:{id:123,tx_ref:reference}};
const verification = {status:'success',data:{id:123,tx_ref:reference,amount:2000,currency:'NGN',status:'successful'}};

test('sandbox adapter rejects live or malformed keys before any request', () => {
  for (const secretKey of ['FLWSECK-live-key','',null,'FLWPUBK_TEST-test']) assert.throws(()=>createSandboxFlutterwave({secretKey}));
});
test('checkout sends expected test parameters and validates returned URL', async () => {
  let called;
  const provider = createSandboxFlutterwave({secretKey:key,fetcher:async (url,options)=>{called={url,options};return {ok:true,json:async()=>({status:'success',data:{link:'https://checkout.flutterwave.com/v3/hosted/pay/example'}})};}});
  const link=await provider.checkout({reference,amount:'2000.00',email:'test@example.com',redirectUrl:'https://example.com/sandbox-checkout/return'});
  assert.equal(link,'https://checkout.flutterwave.com/v3/hosted/pay/example');
  assert.equal(called.url,'https://api.flutterwave.com/v3/payments');
  assert.equal(called.options.redirect,'error');
  const payload=JSON.parse(called.options.body);
  assert.deepEqual([payload.tx_ref,payload.amount,payload.currency],[reference,'2000.00','NGN']);
  const bad=createSandboxFlutterwave({secretKey:key,fetcher:async()=>({ok:true,json:async()=>({status:'success',data:{link:'https://checkout.flutterwave.com.attacker.example/'}})})});
  await assert.rejects(()=>bad.checkout({reference,amount:'2000.00',email:'test@example.com',redirectUrl:'https://example.com/'}));
});
test('verification only sends strictly numeric transaction IDs', async () => {
  let path; const provider=createSandboxFlutterwave({secretKey:key,fetcher:async url=>{path=url;return {ok:true,json:async()=>verification}}});
  await provider.verify('123');assert.equal(path,'https://api.flutterwave.com/v3/transactions/123/verify');
  for(const id of ['../1','0','123?x',Number.MAX_SAFE_INTEGER+1]) await assert.rejects(()=>provider.verify(id));
});
test('webhook requires authentication and direct exact verification before confirming', async () => {
  let verified=0,confirmed=0;
  const provider={verify:async()=>{verified++;return verification}};
  const store={find:async()=>expected,confirm:async()=>{confirmed++}};
  const run=(changes={})=>processSandboxWebhook({header:'secret',secret:'secret',event,provider,store,...changes});
  assert.equal((await run({header:'wrong'})).status,401); assert.equal(verified,0);
  assert.equal((await run()).status,200); assert.equal(verified,1); assert.equal(confirmed,1);
  assert.equal((await run({provider:{verify:async()=>({...verification,data:{...verification.data,amount:2001}})}})).status,422);
  assert.equal(confirmed,1);
  assert.equal((await run({provider:{verify:async()=>{throw Error('offline')}}})).status,503);
  assert.equal((await run({store:{...store,confirm:async()=>{throw Error('db unavailable')}}})).status,503);
  assert.equal((await run({event:{event:'other'}})).status,200);
  assert.equal((await run({event:{event:'charge.completed',data:{id:'../1',tx_ref:reference}}})).status,400);
  assert.equal((await run({store:{...store,find:async()=>null}})).status,200);
});

test('return-flow verification only confirms an owner-visible exact match', async () => {
  const {verifySandboxTransaction}=await import('../lib/payments/flutterwave-sandbox.mjs');
  let confirms=0,verifications=0;
  const store={find:async()=>expected,confirm:async()=>{confirms++}};
  const provider={verify:async()=>{verifications++;return verification}};
  assert.equal((await verifySandboxTransaction({reference,id:'123',provider,store})).status,200);
  assert.equal(confirms,1);
  assert.equal((await verifySandboxTransaction({reference,id:'../123',provider,store})).status,400);
  assert.equal((await verifySandboxTransaction({reference,id:'123',provider,store:{...store,find:async()=>null}})).status,404);
  assert.equal(verifications,1);
  assert.equal((await verifySandboxTransaction({reference,id:'123',provider:{verify:async()=>({...verification,data:{...verification.data,currency:'USD'}})},store})).status,422);
  assert.equal(confirms,1);
});
