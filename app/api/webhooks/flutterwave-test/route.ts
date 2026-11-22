import {createClient} from '@supabase/supabase-js';
import {matchesWebhookSecret} from '@/lib/payments/verification.mjs';
import {createSandboxFlutterwave, processSandboxWebhook} from '@/lib/payments/flutterwave-sandbox.mjs';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  // Disabled unless explicitly enabled on a Vercel preview after review.
  if (process.env.VERCEL_ENV !== 'preview' || process.env.FLUTTERWAVE_TEST_ENABLED !== 'true') return new Response(null, {status: 503});
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!url || !serviceKey || !key || !process.env.FLUTTERWAVE_WEBHOOK_SECRET) return new Response(null, {status: 503});
  if (!matchesWebhookSecret(request.headers.get('verif-hash'), process.env.FLUTTERWAVE_WEBHOOK_SECRET)) return new Response(null, {status: 401});
  if (Number(request.headers.get('content-length') || 0) > 65536) return new Response(null, {status: 413});
  let event: unknown;
  try { const body = await request.text(); if (Buffer.byteLength(body) > 65536) return new Response(null, {status: 413}); event = JSON.parse(body); }
  catch { return new Response(null, {status: 400}); }
  try {
    const db = createClient(url, serviceKey, {auth:{persistSession:false,autoRefreshToken:false}});
    const provider = createSandboxFlutterwave({secretKey:key});
    const result = await processSandboxWebhook({header:request.headers.get('verif-hash'), secret:process.env.FLUTTERWAVE_WEBHOOK_SECRET, event, provider, store:{
      async find(reference) {
        const {data,error} = await db.from('sandbox_payment_intents').select('reference,amount,currency').eq('reference',reference).maybeSingle();
        if (error) throw error;
        return data;
      },
      async confirm(input) {
        const {error} = await db.rpc('confirm_sandbox_payment_intent',{p_reference:input.reference,p_transaction_id:input.transactionId,p_amount:input.amount,p_currency:input.currency});
        if (error) throw error;
      },
    }});
    return new Response(null,{status:result.status});
  } catch { return new Response(null, {status:503}); }
}
