import Link from 'next/link';
import { Trophy, Crown, ArrowUpRight, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business of the Week',
  description: 'Discover the top-performing businesses recognized each week on OUTBIDLY.',
};

export const revalidate = 3600; // Revalidate every hour

export default async function Page() {
  const db = await supabase();
  if (!db) return <div className="wrap page-body"><p>Service unavailable.</p></div>;

  let botw: any = null;
  let pastWinners: any[] = [];

  try {
    // Get current week's business of the week (most recent)
    const botwResult = await db
      .from('business_of_week')
      .select('*, businesses(name, slug, city, country, description, logo_url, business_type)')
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle();
    botw = botwResult.data;

    // Get past winners
    const pastResult = await db
      .from('business_of_week')
      .select('*, businesses(name, slug, city, country)')
      .order('week_start', { ascending: false })
      .limit(12);
    pastWinners = pastResult.data || [];
  } catch (error) {
    console.error('Business of week query failed:', error);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://outbidly.vercel.app';

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(135deg, #1a2a3a 0%, #0f1923 100%)', color: '#fff' }}>
        <div className="wrap">
          <div className="eyebrow" style={{ color: '#e9bd6b' }}>🏆 WEEKLY RECOGNITION</div>
          <h1 style={{ color: '#fff' }}>Business of the <em>Week</em></h1>
          <p style={{ color: '#8b959e' }}>Celebrating the top-performing businesses that are making waves on OUTBIDLY.</p>
        </div>
      </div>

      <div className="wrap page-body">
        {/* Current Winner */}
        {botw && (botw.businesses as any) ? (
          <div style={{
            background: 'linear-gradient(135deg, #1a2a3a 0%, #0f1923 100%)',
            borderRadius: 16,
            padding: 40,
            color: '#fff',
            marginBottom: 40,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle, rgba(233,189,107,0.2) 0%, transparent 70%)', borderRadius: '50%' }} />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <Crown size={18} style={{ color: '#e9bd6b' }} />
              <span style={{ fontSize: 12, letterSpacing: 1.5, color: '#e9bd6b', fontWeight: 800 }}>
                BUSINESS OF THE WEEK — {(botw as any).week_start ? new Date((botw as any).week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
              </span>
            </div>

            <Link href={`/business/${(botw.businesses as any).slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  width: 100,
                  height: 100,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #e9bd6b, #d4a832)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 40,
                  fontWeight: 800,
                  color: '#1a2a3a',
                  flexShrink: 0,
                }}>
                  🏆
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>{(botw.businesses as any).name} <ArrowUpRight size={20} style={{ verticalAlign: 'middle' }} /></h2>
                  <p style={{ color: '#8b959e', marginBottom: 8 }}>{(botw.businesses as any).city}, {(botw.businesses as any).country}</p>
                  <p style={{ color: '#c8d0d8', maxWidth: 500 }}>{(botw.businesses as any).description}</p>
                  {(botw as any).category && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: 12,
                      padding: '6px 14px',
                      background: 'rgba(233,189,107,0.15)',
                      color: '#e9bd6b',
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 700,
                    }}>
                      {(botw as any).category}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <div className="content-card" style={{ textAlign: 'center', padding: 60, marginBottom: 40 }}>
            <Trophy size={48} style={{ color: '#e9bd6b', margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: 24, marginBottom: 12 }}>Business of the Week Coming Soon!</h2>
            <p style={{ color: '#6b7280', marginBottom: 20 }}>The first Business of the Week will be announced soon. Keep competing to be recognized!</p>
            <Link href="/register" className="button gold">Register Your Business →</Link>
          </div>
        )}

        {/* Past Winners */}
        {pastWinners && pastWinners.length > 0 && (
          <div>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>Recent Winners</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {pastWinners.map((w: any) => {
                const biz = w.businesses;
                if (!biz) return null;
                return (
                  <Link
                    key={w.id}
                    href={`/business/${biz.slug}`}
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      padding: 20,
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 24 }}>🏆</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>
                        {w.week_start ? new Date(w.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>
                    <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{biz.name}</h4>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>{biz.city}, {biz.country}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* How to win */}
        <div style={{ marginTop: 40, padding: 30, background: '#f9fafb', borderRadius: 12 }}>
          <h3 style={{ fontSize: 18, marginBottom: 12 }}>How to Become Business of the Week</h3>
          <p style={{ color: '#6b7280', marginBottom: 16 }}>Business of the Week is automatically awarded to the top-performing business in each category based on verified payments and ranking position.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 14 }}>1. Register Free</strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Create your business profile</p>
            </div>
            <div>
              <strong style={{ fontSize: 14 }}>2. Get Approved</strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Our team reviews your business</p>
            </div>
            <div>
              <strong style={{ fontSize: 14 }}>3. Pay to Rank</strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Boost your visibility with verified payments</p>
            </div>
            <div>
              <strong style={{ fontSize: 14 }}>4. Climb the Board</strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Reach the top to earn weekly recognition</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
