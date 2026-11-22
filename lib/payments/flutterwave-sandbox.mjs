import {matchesVerifiedTransaction, matchesWebhookSecret, parseTwoDecimalAmount} from './verification.mjs';

const API = 'https://api.flutterwave.com/v3';
const isTestKey = key => typeof key === 'string' && /^FLWSECK_TEST-[A-Za-z0-9-]+$/.test(key);
const transactionId = id => {
  if (typeof id === 'number' && Number.isSafeInteger(id) && id > 0) return String(id);
  if (typeof id === 'string' && /^[1-9][0-9]{0,19}$/.test(id)) return id;
  return null;
};

// This adapter is test-only: it refuses keys not bearing Flutterwave's v3 test prefix.
export function createSandboxFlutterwave({secretKey, fetcher = fetch}) {
  if (!isTestKey(secretKey)) throw new Error('A Flutterwave test secret key is required');
  async function request(path, options = {}) {
    const response = await fetcher(API + path, {
      ...options, headers: {Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json'},
      cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    if (!response.ok) throw new Error('Flutterwave request failed');
    const body = await response.json();
    if (!body || body.status !== 'success' || !body.data) throw new Error('Flutterwave response invalid');
    return body;
  }
  return {
    async checkout({reference, amount, email, redirectUrl}) {
      const parsed = parseTwoDecimalAmount(amount);
      if (!/^outbidly-test-[0-9a-f-]{36}$/.test(reference) || parsed === null || parsed <= 0n ||
          typeof email !== 'string' || !email.includes('@')) throw new Error('Invalid checkout details');
      const target = new URL(redirectUrl);
      if (target.protocol !== 'https:') throw new Error('HTTPS redirect required');
      const result = await request('/payments', {method: 'POST', body: JSON.stringify({
        tx_ref: reference, amount, currency: 'NGN', redirect_url: target.href,
        customer: {email}, customizations: {title: 'OUTBIDLY test payment'},
      })});
      let link;
      try { link = new URL(result.data.link); } catch { throw new Error('Invalid checkout link'); }
      if (link.protocol !== 'https:' || link.hostname !== 'checkout.flutterwave.com' || link.username || link.password || link.port) throw new Error('Invalid checkout link');
      return link.href;
    },
    async verify(id) {
      const safeId = transactionId(id);
      if (!safeId) throw new Error('Invalid transaction ID');
      return request(`/transactions/${safeId}/verify`);
    },
  };
}

// Direct provider verification is shared by the webhook and the signed-in
// owner's return flow. The store must scope lookup to the authorized owner.
export async function verifySandboxTransaction({reference, id, provider, store}) {
  const safeId = transactionId(id);
  if (!safeId || typeof reference !== 'string' || !/^outbidly-test-[0-9a-f-]{36}$/.test(reference)) return {status:400};
  try {
    const intent = await store.find(reference);
    if (!intent) return {status:404};
    const response = await provider.verify(safeId);
    if (!matchesVerifiedTransaction(response, {transactionId:safeId, reference:intent.reference, amount:intent.amount, currency:intent.currency})) return {status:422};
    await store.confirm({reference:intent.reference, transactionId:safeId, amount:intent.amount, currency:intent.currency});
    return {status:200};
  } catch { return {status:503}; }
}

export async function processSandboxWebhook({header, secret, event, provider, store}) {
  if (!matchesWebhookSecret(header, secret)) return {status:401};
  if (!event || typeof event !== 'object' || event.event !== 'charge.completed') return {status:200};
  const result = await verifySandboxTransaction({reference:event.data?.tx_ref,id:event.data?.id,provider,store});
  return result.status === 404 ? {status:200} : result;
}
