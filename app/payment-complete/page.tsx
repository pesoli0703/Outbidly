import {redirect} from 'next/navigation';
import {supabase} from '@/lib/supabase';

export const metadata = {title: 'Payment Complete', robots: {index: false, follow: false}};
export const dynamic = 'force-dynamic';

export default async function Page({searchParams}: {searchParams: Promise<{tx_ref?: string; status?: string; transaction_id?: string}>}) {
  const db = await supabase();
  if (!db) redirect('/login');

  const {data: {user}} = await db.auth.getUser();
  if (!user) redirect('/login');

  const q = await searchParams;
  const txRef = q.tx_ref;
  const status = q.status;
  const transactionId = q.transaction_id;

  let paymentDetails = null;
  let businessDetails = null;

  if (txRef && db) {
    // Get payment intent details
    const {data: intent} = await db
      .from('payment_intents')
      .select('*, businesses(name, slug, city, country)')
      .eq('reference', txRef)
      .single();

    if (intent) {
      paymentDetails = intent;
      businessDetails = intent.businesses;

      // If payment was successful, update the intent
      if (status === 'successful' && transactionId) {
        await db
          .from('payment_intents')
          .update({
            status: 'verified',
            transaction_id: transactionId,
            verified_at: new Date().toISOString(),
          })
          .eq('reference', txRef);
      }
    }
  }

  const isSuccess = status === 'successful';

  return (
    <div className="wrap page-body">
      <div className="content-card form-card" style={{maxWidth: 600, margin: '0 auto', textAlign: 'center'}}>
        {isSuccess ? (
          <>
            <div style={{fontSize: 64, marginBottom: 20}}>✓</div>
            <h1 style={{fontSize: 32, color: '#2a9d3f', marginBottom: 16}}>Payment Successful!</h1>
            <p style={{color: '#6b7580', marginBottom: 30}}>
              Your payment has been processed successfully. Your business ranking has been updated.
            </p>

            {paymentDetails && businessDetails && (
              <div style={{background: '#f5f5f5', padding: 24, borderRadius: 8, marginBottom: 24, textAlign: 'left'}}>
                <h3 style={{marginBottom: 12}}>Payment Details</h3>
                <p style={{margin: '8px 0'}}><strong>Business:</strong> {businessDetails.name}</p>
                <p style={{margin: '8px 0'}}><strong>Amount:</strong> ₦{paymentDetails.amount.toLocaleString()}</p>
                <p style={{margin: '8px 0'}}><strong>Reference:</strong> {paymentDetails.reference}</p>
                <p style={{margin: '8px 0'}}><strong>Transaction ID:</strong> {transactionId}</p>
              </div>
            )}

            <div style={{display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap'}}>
              <a
                href={businessDetails ? `/business/${businessDetails.slug}` : '/dashboard'}
                style={{
                  background: '#172737',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                View Business Profile
              </a>
              <a
                href="/dashboard"
                style={{
                  background: '#f0f0f0',
                  color: '#333',
                  padding: '12px 24px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Go to Dashboard
              </a>
            </div>
          </>
        ) : (
          <>
            <div style={{fontSize: 64, marginBottom: 20}}>✗</div>
            <h1 style={{fontSize: 32, color: '#d32f2f', marginBottom: 16}}>Payment Not Completed</h1>
            <p style={{color: '#6b7580', marginBottom: 30}}>
              Your payment was not completed. No charges have been made to your account.
            </p>

            {paymentDetails && (
              <div style={{background: '#fff3cd', padding: 20, borderRadius: 8, marginBottom: 24, textAlign: 'left'}}>
                <p style={{margin: 0}}><strong>Reference:</strong> {paymentDetails.reference}</p>
                <p style={{margin: '8px 0 0 0'}}><strong>Status:</strong> {status || 'cancelled'}</p>
              </div>
            )}

            <div style={{display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap'}}>
              <a
                href="/checkout"
                style={{
                  background: '#172737',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Try Again
              </a>
              <a
                href="/dashboard"
                style={{
                  background: '#f0f0f0',
                  color: '#333',
                  padding: '12px 24px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Go to Dashboard
              </a>
            </div>
          </>
        )}

        <div style={{marginTop: 30, padding: '20px', background: '#f9f9f9', borderRadius: 8, fontSize: 13, color: '#666'}}>
          <p style={{margin: 0}}>
            If you have any questions about your payment, please contact support with your reference number.
          </p>
        </div>
      </div>
    </div>
  );
}
