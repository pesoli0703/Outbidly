'use server';
import {redirect} from 'next/navigation';
import {createClient} from '@supabase/supabase-js';
import {supabase} from '@/lib/supabase';
import {createSandboxFlutterwave,verifySandboxTransaction} from '@/lib/payments/flutterwave-sandbox.mjs';

export async function verifyTestPayment(form: FormData) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.FLUTTERWAVE_TEST_ENABLED !== 'true') redirect('/sandbox-checkout?error=Test+checkout+is+disabled');
  const db=await supabase();
  if(!db) redirect('/login');
  const {data:{user}}=await db.auth.getUser();
  if(!user) redirect('/login');
  const key=process.env.FLUTTERWAVE_SECRET_KEY, serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY, url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if(!key||!serviceKey||!url) redirect('/sandbox-checkout?error=Test+verification+is+not+configured');
  const reference=String(form.get('reference')||''), id=String(form.get('transaction_id')||'');
  let status=503;
  try {
    const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const result=await verifySandboxTransaction({reference,id,provider:createSandboxFlutterwave({secretKey:key}),store:{
      async find(ref){
        // Use the signed-in client and RLS, not the service role, to establish ownership.
        const {data,error}=await db.from('sandbox_payment_intents').select('reference,amount,currency').eq('reference',ref).eq('user_id',user.id).maybeSingle();
        if(error) throw error;
        return data;
      },
      async confirm(input){
        const {error}=await service.rpc('confirm_sandbox_payment_intent',{p_reference:input.reference,p_transaction_id:input.transactionId,p_amount:input.amount,p_currency:input.currency});
        if(error) throw error;
      },
    }});
    status=result.status;
  } catch { /* Treat configuration and provider errors as unverified. */ }
  if(status===200) redirect('/sandbox-checkout?message=Test+payment+verified');
  redirect('/sandbox-checkout?error=Test+payment+could+not+be+verified.+Check+your+test+payment+history.');
}
