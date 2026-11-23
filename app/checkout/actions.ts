'use server';
import {redirect} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import {createLiveFlutterwave} from '@/lib/payments/flutterwave-live.mjs';

export async function startLiveCheckout(form: FormData) {
  const db = await supabase();
  if (!db) redirect('/checkout?error=Database+not+configured');

  const {data: {user}} = await db.auth.getUser();
  if (!user?.email) redirect('/login');

  const businessId = form.get('business');
  const categoryId = form.get('category');
  const amount = String(form.get('amount') || '').trim();
  const policy = form.get('policy');

  // Validate inputs
  if (!businessId || !categoryId || !amount || policy !== 'accepted') {
    redirect('/checkout?error=Please+complete+all+required+fields+and+accept+the+terms');
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 2000) {
    redirect('/checkout?error=Amount+must+be+at+least+₦2,000');
  }

  // Verify business belongs to user and is approved
  const {data: business, error: businessError} = await db
    .from('businesses')
    .select('id, name, owner_id, status')
    .eq('id', businessId)
    .single();

  if (businessError || !business) {
    redirect('/checkout?error=Business+not+found');
  }

  if (business.owner_id !== user.id) {
    redirect('/checkout?error=Unauthorized');
  }

  if (business.status !== 'approved') {
    redirect('/checkout?error=Business+must+be+approved+before+making+payments');
  }

  // Create payment intent
  const {data: intentData, error: intentError} = await db
    .rpc('create_payment_intent', {
      p_business_id: businessId,
      p_amount: parsedAmount,
    })
    .single();

  if (intentError || !intentData) {
    console.error('[live-checkout] Failed to create intent:', intentError);
    redirect('/checkout?error=Could+not+create+payment+intent');
  }

  // Get the reference
  const {data: intentRow} = await db
    .from('payment_intents')
    .select('reference, amount')
    .eq('id', intentData)
    .single();

  if (!intentRow) {
    redirect('/checkout?error=Payment+intent+not+found');
  }

  // Check Flutterwave key
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) {
    redirect('/checkout?error=Payment+system+not+configured');
  }

  // Detect test vs live mode
  const isTestMode = secretKey.includes('TEST');
  if (isTestMode) {
    console.warn('[live-checkout] Using TEST Flutterwave key in production checkout');
  }

  // Create Flutterwave checkout
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://outbidly.vercel.app'}/payment-complete`;

  try {
    const flutterwave = createLiveFlutterwave({secretKey});
    const checkoutLink = await flutterwave.checkout({
      reference: intentRow.reference,
      amount: intentRow.amount.toString(),
      email: user.email,
      redirectUrl,
    });

    redirect(checkoutLink);
  } catch (error) {
    console.error('[live-checkout] Flutterwave error:', error);
    redirect('/checkout?error=' + encodeURIComponent(error instanceof Error ? error.message : 'Payment+initialization+failed'));
  }
}
