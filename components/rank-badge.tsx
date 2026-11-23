export function RankBadge({ rank }: { rank: number }) {
  if (rank > 10) return null;

  const config = {
    1: { label: '#1', bg: 'linear-gradient(135deg, #FFD700, #FFA500)', text: '#1a1a1a', border: '#B8860B' },
    2: { label: '#2', bg: 'linear-gradient(135deg, #E8E8E8, #C0C0C0)', text: '#1a1a1a', border: '#909090' },
    3: { label: '#3', bg: 'linear-gradient(135deg, #CD7F32, #8B4513)', text: '#fff', border: '#6B3410' },
  }[rank];

  if (config) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: config.bg,
          color: config.text,
          border: `2px solid ${config.border}`,
          borderRadius: '50%',
          width: 32,
          height: 32,
          fontSize: 13,
          fontWeight: 800,
          fontFamily: 'Manrope, sans-serif',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}
        aria-label={`Ranked number ${rank}`}
      >
        {config.label}
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a2a3a',
        color: '#e9bd6b',
        border: '2px solid #e9bd6b',
        borderRadius: '50%',
        width: 32,
        height: 32,
        fontSize: 11,
        fontWeight: 800,
        fontFamily: 'Manrope, sans-serif',
      }}
      aria-label={`Ranked in top 10 at number ${rank}`}
    >
      #{rank}
    </span>
  );
}
