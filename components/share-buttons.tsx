'use client';
import { useState } from 'react';
import { Copy, Share2, Check } from 'lucide-react';

export function ShareButtons({ businessName, businessSlug, city, country }: { businessName: string; businessSlug: string; city: string; country: string }) {
  const [copied, setCopied] = useState(false);
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://outbidly.vercel.app';
  const profileUrl = `${appUrl}/business/${businessSlug}`;
  const shareText = `Check out ${businessName} on OUTBIDLY! They're ranked in ${city}, ${country}. Register free and pay to boost your visibility.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = profileUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLinks = [
    { label: 'WhatsApp', color: '#25D366', href: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + profileUrl)}` },
    { label: 'Facebook', color: '#1877F2', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}&quote=${encodeURIComponent(shareText)}` },
    { label: 'Twitter', color: '#000000', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}` },
    { label: 'LinkedIn', color: '#0A66C2', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}` },
  ];

  return (
    <div style={{ marginTop: 28, padding: '20px 0', borderTop: '1px solid #e5e7eb' }}>
      <h3 style={{ fontSize: 14, marginBottom: 12, color: '#374151' }}>Share this business</h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {shareLinks.map(link => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              background: link.color,
              color: '#fff',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
          >
            {link.label} ↗
          </a>
        ))}
        <button
          onClick={handleCopy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: '#6b7280',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy link</>}
        </button>
      </div>
    </div>
  );
}
