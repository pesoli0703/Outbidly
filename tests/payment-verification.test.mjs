import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesWebhookSecret, parseTwoDecimalAmount, matchesVerifiedTransaction} from '../lib/payments/verification.mjs';

test('webhook secret requires an exact nonempty match', () => {
  assert.equal(matchesWebhookSecret('abc', 'abc'), true);
  for (const value of ['', 'abd', 'abcd', null]) assert.equal(matchesWebhookSecret(value, 'abc'), false);
  assert.equal(matchesWebhookSecret('', ''), false);
});
test('money parsing uses integer minor units and rejects ambiguous input', () => {
  for (const [value, expected] of [['2000', 200000n], ['500.50', 50050n], [500.5, 50050n], ['0.01', 1n]]) assert.equal(parseTwoDecimalAmount(value), expected);
  for (const value of ['-1', '01', '1e3', '1.001', '', ' 1', Infinity, NaN, null, {}, 1_000_000_001]) assert.equal(parseTwoDecimalAmount(value), null);
});
test('verification requires exact reference, ID, currency, amount and success', () => {
  const expected = {transactionId:'123',reference:'unique-ref',currency:'NGN',amount:'2000.00'};
  const response = {status:'success',data:{id:123,tx_ref:'unique-ref',currency:'NGN',amount:2000,status:'successful'}};
  assert.equal(matchesVerifiedTransaction(response, expected), true);
  for (const change of [{id:124},{tx_ref:'different'},{currency:'USD'},{amount:2000.01},{amount:1999.99},{status:'pending'}]) {
    assert.equal(matchesVerifiedTransaction({...response,data:{...response.data,...change}}, expected), false);
  }
  assert.equal(matchesVerifiedTransaction({...response,status:'error'}, expected), false);
  assert.equal(matchesVerifiedTransaction(response,{...expected,amount:'0'}), false);
  assert.equal(matchesVerifiedTransaction(response,{...expected,transactionId:''}), false);
  assert.equal(matchesVerifiedTransaction(null, expected), false);
});
