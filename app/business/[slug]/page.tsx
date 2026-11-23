import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { ShareButtons } from '@/components/share-buttons';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const db = await supabase();
  if (!db) return { title: 'Business Profile' };
  const { data: b } = await db.from('public_businesses').select('name,description,city,country,logo_url,slug').eq('slug', slug).maybeSingle();
  if (!b) return { title: 'Business Not Found' };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://outbidly.vercel.app';
  const ogImage = b.logo_url
    ? (b.logo_url.startsWith('https://') ? b.logo_url : db.storage.from('business-logos').getPublicUrl(b.logo_url).data.publicUrl)
    : `${appUrl}/api/og/business?name=${encodeURIComponent(b.name)}&city=${encodeURIComponent(b.city)}&country=${encodeURIComponent(b.country)}`;
  return {
    title: `${b.name} — ${b.city}, ${b.country}`,
    description: `${b.description || `Discover ${b.name} on OUTBIDLY, the business visibility platform. Based in ${b.city}, ${b.country}.`}`,
    openGraph: {
      title: `${b.name} | OUTBIDLY`,
      description: `${b.description || `Discover ${b.name} on OUTBIDLY. ${b.city}, ${b.country}.`} Register free. Pay to rank.`,
      url: `${appUrl}/business/${b.slug}`,
      siteName: 'OUTBIDLY',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${b.name} on OUTBIDLY` }],
      locale: 'en_NG',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${b.name} | OUTBIDLY`,
      description: b.description || `Discover ${b.name} on OUTBIDLY. ${b.city}, ${b.country}.`,
      images: [ogImage],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await supabase();
  if (!db) notFound();
  const { data: b } = await db.from('public_businesses').select('*').eq('slug', slug).maybeSingle();
  if (!b) notFound();
  const { data: { user } } = await db.auth.getUser();
  let isOwner = false;
  if (user) {
    const { data: owned } = await db.from('businesses').select('owner_id').eq('slug', slug).maybeSingle();
    isOwner = !!owned && owned.owner_id === user.id;
  }
  const testCheckoutEnabled = process.env.VERCEL_ENV === 'preview' && process.env.FLUTTERWAVE_TEST_ENABLED === 'true';
  const showPayToRank = isOwner && testCheckoutEnabled;

  const socialLinks = [
    b.instagram && { label: 'Instagram', href: b.instagram.startsWith('http') ? b.instagram : `https://instagram.com/${b.instagram.replace('@', '')}`, icon: '📷' },
    b.twitter && { label: 'Twitter', href: b.twitter.startsWith('http') ? b.twitter : `https://twitter.com/${b.twitter.replace('@', '')}`, icon: '🐦' },
    b.facebook && { label: 'Facebook', href: b.facebook.startsWith('http') ? b.facebook : `https://facebook.com/${b.facebook}`, icon: '📘' },
  ].filter(Boolean);

  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <div className="eyebrow">✦ BUSINESS PROFILE</div>
          <h1>{b.name}</h1>
          <p>{b.city}, {b.country}</p>
          {showPayToRank && <Link href="/sandbox-checkout" className="button dark" style={{ marginTop: 16, display: 'inline-block' }}>💰 Pay to rank — ₦2,000</Link>}
        </div>
      </div>
      <div className="wrap page-body prose">
        <h2>About {b.name}</h2>
        <p>{b.description}</p>
        <p>{b.address}</p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
          {b.phone && <a className="button dark" href={'tel:' + b.phone}>📞 Call</a>}
          {b.email && <a className="button dark" href={'mailto:' + b.email}>✉️ Email</a>}
          {b.website && <a className="button dark" href={b.website} target="_blank" rel="noreferrer">🌐 Visit website ↗</a>}
          {b.whatsapp_phone && (
            <a
              className="button dark"
              href={`https://wa.me/${b.whatsapp_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hi ' + b.name + '! I found you on OUTBIDLY.')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: '#25D366' }}
            >
              💬 WhatsApp
            </a>
          )}
        </div>

        {socialLinks.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>Follow us</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {socialLinks.map((s: any) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#1a2a3a', color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  <span>{s.icon}</span> {s.label} ↗
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Social Sharing */}
        <ShareButtons businessName={b.name} businessSlug={b.slug} city={b.city} country={b.country} />

        {showPayToRank && (
          <div className="notice" style={{ background: 'var(--accent-soft)', border: '2px solid var(--accent)' }}>
            <strong>👋 You own this business.</strong> <Link href="/sandbox-checkout">Pay ₦2,000 to claim a ranking position →</Link>
          </div>
        )}

        <div className="notice">Paid rankings are based on verified contributions and do not represent an independent endorsement.</div>
      </div>

      {b.whatsapp_phone && <WhatsAppButton phone={b.whatsapp_phone} businessName={b.name} />}
    </>
  );
}
