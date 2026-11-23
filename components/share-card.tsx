'use client';
import { useRef } from 'react';

export function ShareCard({ businessName, city, country, rank, category, logoUrl, slug }: {
  businessName: string;
  city: string;
  country: string;
  rank?: number;
  category?: string;
  logoUrl?: string;
  slug: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://outbidly.vercel.app';
  const profileUrl = `${appUrl}/business/${slug}`;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    // Use canvas to capture the card
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
      const link = document.createElement('a');
      link.download = `${businessName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-outbidly.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // Fallback: just copy link
      navigator.clipboard?.writeText(profileUrl);
      alert('Link copied! Share it on social media.');
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div
        ref={cardRef}
        style={{
          background: 'linear-gradient(135deg, #1a2a3a 0%, #0f1923 100%)',
          borderRadius: 16,
          padding: 28,
          color: '#fff',
          maxWidth: 500,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'radial-gradient(circle, rgba(233,189,107,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, background: 'radial-gradient(circle, rgba(233,189,107,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#e9bd6b', fontWeight: 800, marginBottom: 4 }}>OUTBIDLY</div>
            <div style={{ fontSize: 11, color: '#8b959e' }}>Business Visibility Platform</div>
          </div>
          {rank && (
            <div style={{
              background: rank <= 3 ? 'linear-gradient(135deg, #e9bd6b, #d4a832)' : 'rgba(255,255,255,0.1)',
              color: rank <= 3 ? '#1a2a3a' : '#fff',
              padding: '8px 14px',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 14,
            }}>
              {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
            </div>
          )}
        </div>

        {/* Business info */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'rgba(233,189,107,0.15)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: 20,
              color: '#e9bd6b',
            }}>
              {businessName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{businessName}</div>
            <div style={{ fontSize: 13, color: '#8b959e' }}>{city}, {country}</div>
          </div>
        </div>

        {/* Category */}
        {category && (
          <div style={{
            display: 'inline-block',
            background: 'rgba(233,189,107,0.15)',
            color: '#e9bd6b',
            padding: '6px 14px',
            borderRadius: 99,
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 20,
          }}>
            {category}
          </div>
        )}

        {/* CTA */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, marginTop: 16 }}>
          <div style={{ fontSize: 11, color: '#8b959e', marginBottom: 6 }}>Discover on OUTBIDLY</div>
          <div style={{ fontSize: 12, color: '#e9bd6b', fontWeight: 600 }}>{profileUrl}</div>
        </div>
      </div>

      <button
        onClick={handleDownload}
        style={{
          marginTop: 12,
          padding: '10px 20px',
          background: '#e9bd6b',
          color: '#1a2a3a',
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        📥 Download Share Card
      </button>
    </div>
  );
}
