import {NextRequest, NextResponse} from 'next/server';
import {supabase} from '@/lib/supabase';
import {createLiveFlutterwave, processLiveWebhook} from '@/lib/payments/flutterwave-live.mjs';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('verif-hash');
    const payload = await request.json();

    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    const webhookSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

    if (!secretKey || !webhookSecret) {
      console.error('[live-webhook] Missing Flutterwave configuration');
      return NextResponse.json({error: 'Payment system not configured'}, {status: 500});
    }

    const db = await supabase();
    if (!db) {
      console.error('[live-webhook] Database not configured');
      return NextResponse.json({error: 'Database not configured'}, {status: 500});
    }

    const provider = createLiveFlutterwave({secretKey});
    const store = {
      find: async (reference: string) => {
        const {data} = await db
          .from('payment_intents')
          .select('reference, amount, currency')
          .eq('reference', reference)
          .single();
        return data;
      },
      confirm: async ({reference, transactionId, amount, currency}: {reference: string; transactionId: string; amount: number; currency: string}) => {
        await db
          .from('payment_intents')
          .update({
            status: 'verified',
            transaction_id: transactionId,
            verified_at: new Date().toISOString(),
          })
          .eq('reference', reference);
      },
    };

    const result = await processLiveWebhook({
      header: signature,
      secret: webhookSecret,
      event: payload,
      provider,
      store,
    });

    return NextResponse.json({status: result.status}, {status: result.status});
  } catch (error) {
    console.error('[live-webhook] Error:', error);
    return NextResponse.json({error: 'Webhook processing failed'}, {status: 500});
  }
}
