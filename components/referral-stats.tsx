'use client';

import { useState } from 'react';

export function ReferralStats({ referralLink, totalReferrals }: { referralLink: string; totalReferrals: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
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
            onClick={handleCopy}
            style={{ padding: '8px 16px', background: '#e9bd6b', color: '#1a2a3a', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </section>
  );
}
