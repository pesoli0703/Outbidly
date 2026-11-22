'use server';
import {redirect} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import {createSandboxFlutterwave} from '@/lib/payments/flutterwave-sandbox.mjs';

export async function startSandboxCheckout(form: FormData) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.FLUTTERWAVE_TEST_ENABLED !== 'true') redirect('/sandbox-checkout?error=Test+checkout+is+disabled');
  const db = await supabase();
  if (!db) redirect('/sandbox-checkout?error=Service+unavailable');
  const {data:{user}} = await db.auth.getUser();
  if (!user?.email) redirect('/login');
  const amount = String(form.get('amount') ?? '').trim();
  const business = String(form.get('business') ?? '');
  const category = String(form.get('category') ?? '');
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(amount) || form.get('policy') !== 'accepted') redirect('/sandbox-checkout?error=Check+the+amount+and+policy');
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!key || !base || !/^FLWSECK_TEST-[A-Za-z0-9-]+$/.test(key)) redirect('/sandbox-checkout?error=Test+checkout+is+not+configured');
  let redirectUrl: string;
  try {const u = new URL(base); if(u.protocol !== 'https:' || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw Error(); redirectUrl = new URL('/sandbox-checkout/return',u).href;} catch {redirect('/sandbox-checkout?error=Test+checkout+is+not+configured');}
  const {data,error} = await db.rpc('create_sandbox_payment_intent',{p_business_id:business,p_category_id:category,p_amount:amount,p_policy_accepted:true}).single();
  if (error || !data) redirect('/sandbox-checkout?error=Could+not+create+test+payment.+Check+business%2C+category+and+minimum.');
  const intent = data as {reference: string; amount: number | string};
  let link: string;
  try {link = await createSandboxFlutterwave({secretKey:key}).checkout({reference:intent.reference,amount:String(intent.amount),email:user.email,redirectUrl});}
  catch {redirect('/sandbox-checkout?error=Unable+to+start+test+checkout.+Please+try+again.');}
  redirect(link);
}
