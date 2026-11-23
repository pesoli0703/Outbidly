import {redirect} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import {startLiveCheckout} from './actions';

export const metadata = {title: 'Boost Your Ranking', robots: {index: false, follow: false}};
export const dynamic = 'force-dynamic';

export default async function Page({searchParams}: {searchParams: Promise<{error?: string; message?: string}>}) {
  const db = await supabase();
  if (!db) redirect('/login');
  const {data: {user}} = await db.auth.getUser();
  if (!user) redirect('/login');

  // Get user's approved businesses
  const {data: businesses, error: businessError} = await db
    .from('businesses')
    .select('id, name, city, country')
    .eq('owner_id', user.id)
    .eq('status', 'approved')
    .order('name');

  // Get categories for the payment
  const {data: categories} = await db
    .from('categories')
    .select('id, name')
    .eq('active', true)
    .order('name');

  const q = await searchParams;

  return (
    <div className="wrap page-body">
      <div className="content-card form-card" style={{maxWidth: 600, margin: '0 auto'}}>
        <h1 style={{fontSize: 32, marginBottom: 8}}>Boost Your Ranking</h1>
        <p style={{color: '#6b7580', marginBottom: 30}}>Make a payment to increase your business visibility on the leaderboard. Every payment counts towards your ranking position.</p>

        {q.error && <div role="alert" style={{background: '#fee', border: '2px solid #c00', color: '#900', padding: '16px 20px', borderRadius: 8, marginBottom: 20, fontSize: 14}}>⚠️ {q.error}</div>}
        {q.message && <div style={{background: '#efe', border: '2px solid #0c0', color: '#060', padding: '16px 20px', borderRadius: 8, marginBottom: 20, fontSize: 14}}>✓ {q.message}</div>}

        {businessError ? (
          <p style={{color: '#c00'}}>Could not load your businesses.</p>
        ) : businesses?.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px 20px'}}>
            <p style={{marginBottom: 20}}>You don't have any approved businesses yet.</p>
            <a href="/dashboard" style={{background: '#172737', color: 'white', padding: '12px 24px', borderRadius: 6, textDecoration: 'none', fontWeight: 600}}>Go to Dashboard</a>
          </div>
        ) : (
          <form action={startLiveCheckout}>
            <label style={{fontWeight: 600, marginBottom: 8, display: 'block'}}>Select Business *</label>
            <select name="business" required style={{width: '100%', padding: 12, borderRadius: 6, border: '1px solid #ddd', marginBottom: 20, fontSize: 14}}>
              <option value="">Choose a business...</option>
              {businesses?.map(b => (
                <option key={b.id} value={b.id}>{b.name} — {b.city}, {b.country}</option>
              ))}
            </select>

            <label style={{fontWeight: 600, marginBottom: 8, display: 'block'}}>Category *</label>
            <select name="category" required style={{width: '100%', padding: 12, borderRadius: 6, border: '1px solid #ddd', marginBottom: 20, fontSize: 14}}>
              <option value="">Select category...</option>
              {categories?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <label style={{fontWeight: 600, marginBottom: 8, display: 'block'}}>Payment Amount (NGN) *</label>
            <input
              name="amount"
              type="number"
              min="2000"
              step="0.01"
              placeholder="2000.00"
              required
              style={{width: '100%', padding: 12, borderRadius: 6, border: '1px solid #ddd', marginBottom: 20, fontSize: 14}}
            />
            <p style={{color: '#6b7580', fontSize: 13, marginTop: -12, marginBottom: 20}}>
              Minimum payment: ₦2,000. First-time payments start at ₦2,000, subsequent payments can be ₦500 or more.
            </p>

            <label style={{display: 'flex', alignItems: 'flex-start', marginBottom: 24, fontSize: 13, color: '#555'}}>
              <input type="checkbox" name="policy" value="accepted" required style={{marginRight: 10, marginTop: 3}} />
              <span>I understand that this payment is non-refundable and will be used to boost my business ranking on the OUTBIDLY leaderboard.</span>
            </label>

            <button
              type="submit"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #172737 0%, #2a4a5e 100%)',
                color: 'white',
                padding: '16px',
                borderRadius: 8,
                border: 'none',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Continue to Payment →
            </button>
          </form>
        )}

        <div style={{marginTop: 30, padding: '20px', background: '#f5f5f5', borderRadius: 8, fontSize: 13, color: '#666'}}>
          <strong style={{display: 'block', marginBottom: 8}}>💳 Secure Payment</strong>
          <p style={{margin: 0}}>Payments are processed securely through Flutterwave. Your payment information is encrypted and never stored on our servers.</p>
        </div>
      </div>
    </div>
  );
}
