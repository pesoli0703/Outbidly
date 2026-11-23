'use client';

export function ShareCard({ businessName, city, country, rank, category, slug }: {
  businessName: string;
  city: string;
  country: string;
  rank?: number;
  category?: string;
  slug: string;
}) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://outbidly.vercel.app';
  const profileUrl = `${appUrl}/business/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      alert('Link copied! Share it on social media.');
    } catch {
      alert(`Copy this link: ${profileUrl}`);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #1a2a3a 0%, #0f1923 100%)',
          borderRadius: 16,
          padding: 28,
          color: '#fff',
          maxWidth: 500,
          position: 'relative',
          overflow: 'hidden',
          border: '2px solid rgba(233,189,107,0.3)',
        }}
      >
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'radial-gradient(circle, rgba(233,189,107,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />

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

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{businessName}</div>
          <div style={{ fontSize: 14, color: '#8b959e' }}>{city}, {country}</div>
        </div>

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

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
          <div style={{ fontSize: 11, color: '#8b959e', marginBottom: 6 }}>Discover on OUTBIDLY</div>
          <div style={{ fontSize: 12, color: '#e9bd6b', fontWeight: 600, wordBreak: 'break-all' }}>{profileUrl}</div>
        </div>
      </div>

      <button
        onClick={handleCopy}
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
        📋 Copy Profile Link
      </button>
    </div>
  );
}
