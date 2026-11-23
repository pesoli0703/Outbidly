import Link from 'next/link';
import { Trophy, ArrowUpRight, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }): Promise<Metadata> {
  const { country } = await params;
  return {
    title: `${country} Business Leaderboard`,
    description: `Discover the top businesses in ${country}. Register free, pay to rank, and boost your visibility.`,
    openGraph: {
      title: `${country} Business Leaderboard | OUTBIDLY`,
      description: `Discover top businesses in ${country}. Register free and pay to rank.`,
      url: `/countries/${country}`,
    },
  };
}

const countries = [
  { code: 'Nigeria', flag: '🇳🇬', featured: true },
  { code: 'Ghana', flag: '🇬🇭', featured: true },
  { code: 'South Africa', flag: '🇿🇦', featured: true },
  { code: 'Kenya', flag: '🇰🇪', featured: true },
  { code: 'United Kingdom', flag: '🇬🇧', featured: true },
  { code: 'United States', flag: '🇺🇸', featured: true },
  { code: 'Canada', flag: '🇨🇦', featured: true },
  { code: 'India', flag: '🇮🇳', featured: false },
  { code: 'Australia', flag: '🇦🇺', featured: false },
  { code: 'Germany', flag: '🇩🇪', featured: false },
];

export default async function Page({ params, searchParams }: {
  params: Promise<{ country: string }>;
  searchParams: Promise<{ category?: string; period?: string }>;
}) {
  const { country } = await params;
  const q = await searchParams;
  const category = q.category || 'Fashion Designers';
  const period = q.period || 'lifetime';

  const db = await supabase();
  let leaders: any[] = [];
  let error = false;

  if (db) {
    const result = await db.rpc('public_leaderboard_with_rank', {
      p_category: category,
      p_period: period,
      p_scope: 'country',
      p_country: country,
      p_city: null,
      p_search: null,
    });
    leaders = result.data || [];
    error = !!result.error;
  }

  const decodedCountry = decodeURIComponent(country);

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(135deg, #1a2a3a 0%, #0f1923 100%)', color: '#fff' }}>
        <div className="wrap">
          <div className="eyebrow" style={{ color: '#e9bd6b' }}>🌍 COUNTRY LEADERBOARD</div>
          <h1 style={{ color: '#fff' }}>{decodedCountry} <em>Leaderboard</em></h1>
          <p style={{ color: '#8b959e' }}>Discover the top businesses in {decodedCountry}. Register free, pay to rank, and boost your visibility.</p>
        </div>
      </div>

      <div className="wrap page-body">
        {/* Country selector */}
        <div style={{ marginBottom: 30 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Other Countries</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {countries.map(c => (
              <Link
                key={c.code}
                href={`/countries/${encodeURIComponent(c.code)}`}
                style={{
                  padding: '8px 14px',
                  background: c.code === decodedCountry ? '#e9bd6b' : '#f5f5f5',
                  color: c.code === decodedCountry ? '#1a2a3a' : '#374151',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{c.flag}</span> {c.code}
              </Link>
            ))}
            <Link
              href="/rankings"
              style={{
                padding: '8px 14px',
                background: '#1a2a3a',
                color: '#fff',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Globe size={12} /> Global
            </Link>
          </div>
        </div>

        {/* Filters */}
        <form className="filters" style={{ marginBottom: 24 }}>
          <select name="category" defaultValue={category}>
            <option value="Fashion Designers">Fashion Designers</option>
            <option value="Restaurants">Restaurants</option>
            <option value="Technology">Technology</option>
            <option value="Beauty and Cosmetics">Beauty and Cosmetics</option>
            <option value="Real Estate">Real Estate</option>
          </select>
          <select name="period" defaultValue={period}>
            <option value="lifetime">All Time</option>
            <option value="monthly">This Month</option>
            <option value="weekly">This Week</option>
            <option value="daily">Today</option>
          </select>
          <button className="button dark">Apply</button>
        </form>

        {/* Leaderboard */}
        {error ? (
          <div className="content-card">
            <p className="form-error">Leaderboard temporarily unavailable.</p>
          </div>
        ) : leaders.length === 0 ? (
          <div className="content-card" style={{ textAlign: 'center', padding: 60 }}>
            <Trophy size={40} style={{ color: '#e9bd6b', margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: 20, marginBottom: 10 }}>Be the First in {decodedCountry}!</h3>
            <p style={{ color: '#6b7280', marginBottom: 20 }}>No businesses ranked yet in this category. Register free and claim the top spot.</p>
            <Link href="/register" className="button gold">Register Your Business →</Link>
          </div>
        ) : (
          <div className="content-card">
            {leaders.map((leader: any, index: number) => (
              <Link
                key={leader.business_id}
                href={`/business/${leader.slug}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr auto',
                  gap: 16,
                  alignItems: 'center',
                  padding: 16,
                  borderBottom: index < leaders.length - 1 ? '1px solid #f0f0f0' : 'none',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: index === 0 ? '#e9bd6b' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#f5f5f5',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: 14,
                  color: index < 3 ? '#1a2a3a' : '#6b7280',
                }}>
                  {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{leader.name} <ArrowUpRight size={12} style={{ verticalAlign: 'middle' }} /></div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{leader.city}</div>
                </div>
                <div style={{ fontWeight: 700, color: '#e9bd6b' }}>
                  ₦{Number(leader.total).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{ marginTop: 40, textAlign: 'center', padding: 40, background: '#f9fafb', borderRadius: 12 }}>
          <h3 style={{ fontSize: 20, marginBottom: 10 }}>Want to Rank in {decodedCountry}?</h3>
          <p style={{ color: '#6b7280', marginBottom: 20 }}>Register free, get approved, then pay ₦2,000 to claim your spot on the leaderboard.</p>
          <Link href="/register" className="button gold">Register Free →</Link>
        </div>
      </div>
    </>
  );
}
