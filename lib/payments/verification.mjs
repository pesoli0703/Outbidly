import { timingSafeEqual } from 'node:crypto';

// These helpers are not a payment processor. Call only on the server after an
// authenticated request to Flutterwave's transaction verification endpoint.
export function matchesWebhookSecret(received, secret) {
  if (typeof received !== 'string' || typeof secret !== 'string' || !secret) return false;
  const a = Buffer.from(received, 'utf8');
  const b = Buffer.from(secret, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

// Exact two-decimal currency values, represented as integer minor units.
// Only use this for currencies configured with two decimal places.
export function parseTwoDecimalAmount(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'number' && (!Number.isFinite(value) || Math.abs(value) > 1_000_000_000)) return null;
  const text = String(value);
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function matchesVerifiedTransaction(response, expected) {
  if (!response || typeof response !== 'object' || response.status !== 'success' || !response.data || typeof response.data !== 'object' || !expected || typeof expected !== 'object') return false;
  const data = response.data;
  const expectedAmount = parseTwoDecimalAmount(expected.amount);
  const actualAmount = parseTwoDecimalAmount(data.amount);
  const id = value => (typeof value === 'string' && /^[1-9]\d*$/.test(value)) || (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) ? String(value) : null;
  const expectedId = id(expected.transactionId);
  return typeof expected.reference === 'string' && expected.reference.length > 0 &&
    typeof expected.currency === 'string' && /^[A-Z]{3}$/.test(expected.currency) &&
    expectedId !== null && id(data.id) === expectedId &&
    data.status === 'successful' && data.tx_ref === expected.reference &&
    data.currency === expected.currency && expectedAmount !== null && expectedAmount > 0n && actualAmount === expectedAmount;
}
