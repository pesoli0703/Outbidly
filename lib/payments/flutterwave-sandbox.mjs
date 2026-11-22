import {matchesVerifiedTransaction, matchesWebhookSecret, parseTwoDecimalAmount} from './verification.mjs';

const API = 'https://api.flutterwave.com/v3';
const isFlutterwaveKey = key => typeof key === 'string' && /^FLWSECK[-_][A-Za-z0-9-]+$/.test(key);
const transactionId = id => {
  if (typeof id === 'number' && Number.isSafeInteger(id) && id > 0) return String(id);
  if (typeof id === 'string' && /^[1-9][0-9]{0,19}$/.test(id)) return id;
  return null;
};

// Flutterwave checkout adapter: accepts both test and live keys.
export function createSandboxFlutterwave({secretKey, fetcher = fetch}) {
  if (!isFlutterwaveKey(secretKey)) throw new Error('A valid Flutterwave secret key is required');
  return {
    async checkout({reference, amount, email, redirectUrl}) {
      const parsed = parseTwoDecimalAmount(amount);
      if (!/^outbidly-test-[0-9a-f-]{36}$/.test(reference) || parsed === null || parsed <= 0n ||
          typeof email !== 'string' || !email.includes('@')) throw new Error('Invalid checkout details: ref='+reference+' amt='+amount);
      const target = new URL(redirectUrl);
      if (target.protocol !== 'https:') throw new Error('HTTPS redirect required: '+redirectUrl);
      const response = await fetcher(API + '/payments', {
        method: 'POST', headers: {Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json'},
        cache: 'no-store', signal: AbortSignal.timeout(15000), redirect: 'follow',
        body: JSON.stringify({
          tx_ref: reference, amount, currency: 'NGN', redirect_url: target.href,
          customer: {email}, customizations: {title: 'OUTBIDLY test payment'},
        }),
      });
      const status = response.status;
      if (!response.ok) {
        const text = await response.text().catch(()=>'');
        throw new Error('Flutterwave API '+status+': '+text.slice(0,500));
      }
      const body = await response.json();
      if (!body || body.status !== 'success' || !body.data) throw new Error('Flutterwave response invalid: '+JSON.stringify(body).slice(0,300));
      let link;
      try { link = new URL(body.data.link); } catch { throw new Error('Invalid checkout link in response'); }
      const allowed = ['checkout.flutterwave.com','checkout-v2.dev-flutterwave.com','checkout.flutterwave.co'];
      if (link.protocol !== 'https:' || !allowed.includes(link.hostname) || link.username || link.password || link.port) throw new Error('Invalid checkout link domain: '+link.hostname);
      return link.href;
    },
    async verify(id) {
      const safeId = transactionId(id);
      if (!safeId) throw new Error('Invalid transaction ID');
      const response = await fetcher(API + '/transactions/' + safeId + '/verify', {
        headers: {Authorization: `Bearer ${secretKey}`},
        cache: 'no-store', signal: AbortSignal.timeout(15000), redirect: 'follow',
      });
      if (!response.ok) {
        const text = await response.text().catch(()=>'');
        throw new Error('Flutterwave verify failed '+response.status+': '+text.slice(0,300));
      }
      const body = await response.json();
      if (!body || body.status !== 'success' || !body.data) throw new Error('Flutterwave verify response invalid: '+JSON.stringify(body).slice(0,300));
      return body;
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
