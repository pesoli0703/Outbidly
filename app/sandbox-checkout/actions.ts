'use server';
import {redirect} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import {createSandboxFlutterwave} from '@/lib/payments/flutterwave-sandbox.mjs';

export async function startSandboxCheckout(form: FormData) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.FLUTTERWAVE_TEST_ENABLED !== 'true') {
    console.error('[checkout] disabled:', process.env.VERCEL_ENV, process.env.FLUTTERWAVE_TEST_ENABLED);
    redirect('/sandbox-checkout?error=Test+checkout+is+disabled');
  }
  const db = await supabase();
  if (!db) { console.error('[checkout] no supabase client'); redirect('/sandbox-checkout?error=Service+unavailable'); }
  const {data:{user}} = await db.auth.getUser();
  if (!user?.email) { console.error('[checkout] not signed in'); redirect('/login'); }
  const amount = String(form.get('amount') ?? '').trim();
  const business = String(form.get('business') ?? '');
  const category = String(form.get('category') ?? '');
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(amount) || form.get('policy') !== 'accepted') {
    console.error('[checkout] invalid amount or policy:', amount, form.get('policy'));
    redirect('/sandbox-checkout?error=Check+the+amount+and+policy');
  }
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!key) { console.error('[checkout] missing FLUTTERWAVE_SECRET_KEY'); redirect('/sandbox-checkout?error=Flutterwave+key+is+not+set'); }
  if (!base) { console.error('[checkout] missing NEXT_PUBLIC_APP_URL'); redirect('/sandbox-checkout?error=App+URL+is+not+set'); }
  if (!/^FLWSECK[-_][A-Za-z0-9-]+$/.test(key)) { console.error('[checkout] bad key format:', key.slice(0,14)+'...'); redirect('/sandbox-checkout?error=Flutterwave+key+has+wrong+format+(must+start+with+FLWSECK-)'); }
  let redirectUrl: string;
  try {const u = new URL(base); if(u.protocol !== 'https:' || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw Error(); redirectUrl = new URL('/sandbox-checkout/return',u).href;}
  catch (e) { console.error('[checkout] bad app URL:', base, e); redirect('/sandbox-checkout?error=Test+checkout+URL+is+not+configured'); }
  console.log('[checkout] creating intent for business', business, 'category', category, 'amount', amount, 'user', user.id);
  const {data,error} = await db.rpc('create_sandbox_payment_intent',{p_business_id:business,p_category_id:category,p_amount:amount,p_policy_accepted:true}).single();
  if (error || !data) { console.error('[checkout] RPC failed:', error?.message, error?.details, error?.hint); redirect('/sandbox-checkout?error=Could+not+create+test+payment.+Check+business%2C+category+and+minimum.'); }
  const intent = data as {reference: string; amount: number | string};
  console.log('[checkout] intent created:', intent.reference, intent.amount);
  let link: string;
  try { link = await createSandboxFlutterwave({secretKey:key}).checkout({reference:intent.reference,amount:String(intent.amount),email:user.email,redirectUrl}); }
  catch (e) { const msg = e instanceof Error ? e.message : String(e); console.error('[checkout] Flutterwave failed:', msg); redirect('/sandbox-checkout?error=' + encodeURIComponent(msg)); }
  console.log('[checkout] redirecting to', link);
  redirect(link);
}
