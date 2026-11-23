import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { submitBusiness, logout, markNotificationRead } from '@/app/actions';
import { ShareButtons } from '@/components/share-buttons';

export const metadata = { title: 'Your dashboard', robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const q = await searchParams;
  const db = await supabase();
  if (!db) redirect('/login?error=Service+not+configured');
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [businessResult, categoryResult, notificationResult] = await Promise.all([
    db.from('businesses').select('id,name,status,city,country,slug,referral_code,referral_count').eq('owner_id', user.id).order('created_at', { ascending: false }),
    db.from('categories').select('name').eq('active', true).order('name'),
    db.from('notifications').select('id,message,read_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
  ]);

  const businesses = businessResult.data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://outbidly.vercel.app';
  const referralLink = businesses?.[0]?.referral_code ? `${appUrl}/register?ref=${businesses[0].referral_code}` : `${appUrl}/register`;
  const totalReferrals = businesses?.reduce((sum, b) => sum + (b.referral_count || 0), 0) || 0;

  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <div className="eyebrow">✦ YOUR SPACE</div>
          <h1>Welcome to your <em>dashboard.</em></h1>
          <p>Manage your businesses and build your presence on OUTBIDLY.</p>
          <p><Link className="text-link" style={{ display: "inline-flex" }} href="/account">Account settings ↗</Link></p>
          <form action={logout}><button className="button dark">Sign out</button></form>
        </div>
      </div>
      <div className="wrap page-body">

        {/* Referral Stats */}
        {(businesses?.length ?? 0) > 0 && (
          <section style={{ marginBottom: 30 }}>
            <div style={{ background: 'linear-gradient(135deg, #1a2a3a 0%, #0f1923 100%)', borderRadius: 12, padding: 24, color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>🎯 Your Referral Stats</h2>
                  <p style={{ color: '#8b959e', fontSize: 13, margin: 0 }}>Invite other businesses and help them grow.</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#e9bd6b' }}>{totalReferrals}</div>
                  <div style={{ fontSize: 11, color: '#8b959e' }}>Successful referrals</div>
                </div>
              </div>
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <code style={{ fontSize: 13, color: '#e9bd6b', flex: 1 }}>{referralLink}</code>
                <button
                  onClick={async () => { try { await navigator.clipboard.writeText(referralLink); } catch {} }}
                  style={{ padding: '8px 16px', background: '#e9bd6b', color: '#1a2a3a', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                >
                  Copy Link
                </button>
              </div>
            </div>
          </section>
        )}

        <h2>Your businesses</h2>
        {q.error && <p className="form-error">{q.error}</p>}
        {q.message && <p className="form-success">{q.message}</p>}

        <div className="business-grid">
          {businesses?.map(b => (
            <div className="business-card" key={b.id}>
              <h3>{b.name}</h3>
              <p>{b.city}, {b.country}</p>
              <div className="eyebrow">{b.status.replace('_', ' ').toUpperCase()}</div>
              {b.status === 'approved' && (
                <>
                  <p><Link href={'/business/' + b.slug}>View profile ↗</Link></p>
                  <ShareButtons businessName={b.name} businessSlug={b.slug} city={b.city} country={b.country} />
                </>
              )}
            </div>
          ))}
        </div>

        {businessResult.error ? <div className="content-card form-error">Businesses could not be loaded. Please try again.</div> : !businesses?.length && <div className="content-card"><p>No businesses yet. Add your first business below.</p></div>}

        <section id="notifications" style={{ marginTop: 35 }}>
          <h2>Notifications</h2>
          {notificationResult.error ? <p className="form-error">Notifications could not be loaded.</p> : !notificationResult.data?.length ? <div className="content-card">No notifications yet.</div> : notificationResult.data.map(n => <div className="content-card" style={{ marginBottom: 8 }} key={n.id}><strong>{n.read_at ? "Read" : "Unread"}</strong><p>{n.message}</p><small>{new Date(n.created_at).toUTCString()}</small>{!n.read_at && <form action={markNotificationRead}><input type="hidden" name="id" value={n.id} /><button className="button dark small">Mark as read</button></form>}</div>)}
        </section>

        <div className="content-card form-card" style={{ margin: '40px 0', maxWidth: 760 }}>
          <div className="eyebrow">✦ YOUR NEXT MOVE</div>
          <h2>Register a business</h2>
          <p>Submit your details for review. Creating a profile is free, and an external website is optional.</p>
          <form action={submitBusiness}>
            <label>Business name *</label><input name="name" required />
            <label>Business description *</label><textarea name="description" rows={4} required />
            <label>Country *</label><input name="country" required />
            <label>City *</label><input name="city" required />
            <label>Business address or service area *</label><input name="address" required />
            <label>Business type *</label><select name="business_type" required><option value="">Choose a type</option><option>Registered company</option><option>Sole proprietor</option><option>Freelancer</option><option>Individual professional</option><option>Other</option></select>
            <label>Primary contact name *</label><input name="contact_name" required />
            <p>After approval, your business address, email, phone and website will be publicly visible. Your primary contact name is private.</p>
            <label>Business email *</label><input name="email" type="email" required />
            <label>Business phone with country code *</label><input name="phone" type="tel" placeholder="+234..." pattern="\+[1-9][0-9]{6,14}" required />
            <label>Website (optional)</label><input name="website" type="url" placeholder="https://" />
            <div style={{ margin: "18px 0 6px", fontSize: 12, fontWeight: 700, color: "#52606b" }}>Social media (optional — helpful if you don't have a website)</div>
            <label>Instagram handle</label><input name="instagram" placeholder="@yourbrand" />
            <label>Twitter / X handle</label><input name="twitter" placeholder="@yourbrand" />
            <label>Facebook page URL</label><input name="facebook" type="url" placeholder="https://facebook.com/yourbrand" />
            <label>WhatsApp business number (with country code)</label><input name="whatsapp_phone" type="tel" placeholder="+234..." />
            <label>Business logo or profile image * (PNG, JPEG or WebP; max 2 MB)</label><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" required />
            <label>Industry categories * (select one or more)</label><select name="categories" multiple required size={8}>{categoryResult.data?.map(c => <option key={c.name}>{c.name}</option>)}</select>
            {categoryResult.error && <p className="form-error">Categories are unavailable. Please try again.</p>}
            <button className="button dark" disabled={!!categoryResult.error || !categoryResult.data?.length}>Submit for approval →</button>
          </form>
        </div>
      </div>
    </>
  );
}
