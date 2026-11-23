import {notFound} from 'next/navigation';
import Link from 'next/link';
import {ArrowUpRight, ExternalLink, Globe, MapPin, Shield, Building, Users, Calendar} from 'lucide-react';
import {supabase} from '@/lib/supabase';

export async function generateMetadata({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const db = await supabase();
  if (!db) return {title: 'Company Profile'};
  const {data} = await db.from('global_companies').select('name').eq('slug', slug).single();
  return {title: data?.name || 'Company Profile'};
}

export default async function Page({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const db = await supabase();
  if (!db) notFound();

  const {data: company, error} = await db
    .from('global_companies')
    .select(`
      *,
      industry:global_industries(name)
    `)
    .eq('slug', slug)
    .single();

  if (error || !company) notFound();

  const statusLabel = company.profile_status === 'unclaimed' ? 'Unclaimed Profile' :
                      company.profile_status === 'claimed' ? 'Claim Pending' :
                      'Verified Business';

  return (
    <div className="gcp-page">
      {/* Breadcrumb */}
      <div className="gcp-breadcrumb">
        <Link href="/global-directory">Global Directory</Link>
        <span>›</span>
        <span>{company.name}</span>
      </div>

      {/* Header */}
      <section className="gcp-header">
        <div className="gcp-header-inner">
          <div className="gcp-logo-wrap">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="gcp-logo"/>
            ) : (
              <div className="gcp-logo-placeholder">
                {company.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="gcp-header-info">
            <div className="gcp-status-row">
              <h1>{company.name}</h1>
              <span className={`gcp-status gcp-status-${company.profile_status}`}>
                {company.profile_status === 'verified' && <Shield size={12}/>}
                {statusLabel}
              </span>
            </div>
            {company.description && <p className="gcp-description">{company.description}</p>}
            <div className="gcp-meta-row">
              {company.headquarters && (
                <span className="gcp-meta"><MapPin size={13}/> {company.headquarters}</span>
              )}
              {!company.headquarters && (
                <span className="gcp-meta"><MapPin size={13}/> {company.city ? `${company.city}, ` : ''}{company.country}</span>
              )}
              {company.founded_year && (
                <span className="gcp-meta"><Calendar size={13}/> Founded {company.founded_year}</span>
              )}
              {company.industry && (
                <span className="gcp-meta"><Building size={13}/> {(company.industry as any).name}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="gcp-actions">
        {company.website && (
          <a href={company.website} target="_blank" rel="noopener noreferrer" className="gcp-action-btn gcp-action-primary">
            <ExternalLink size={14}/> Visit Website <ArrowUpRight size={13}/>
          </a>
        )}
        {company.profile_status === 'unclaimed' && (
          <Link href={`/claim-business/${company.slug}`} className="gcp-action-btn gcp-action-claim">
            <Shield size={14}/> Claim This Business
          </Link>
        )}
      </section>

      {/* Details */}
      <section className="gcp-details">
        <div className="gcp-detail-card">
          <h3>Company Details</h3>
          <div className="gcp-detail-grid">
            <div><strong>Industry</strong><span>{(company.industry as any)?.name || 'Not specified'}</span></div>
            <div><strong>Country</strong><span>{company.country}</span></div>
            {company.city && <div><strong>City</strong><span>{company.city}</span></div>}
            {company.founded_year && <div><strong>Founded</strong><span>{company.founded_year}</span></div>}
            {company.headquarters && <div><strong>Headquarters</strong><span>{company.headquarters}</span></div>}
            {company.website && <div><strong>Website</strong><span><a href={company.website} target="_blank" rel="noopener noreferrer">{company.website} <ArrowUpRight size={11}/></a></span></div>}
          </div>
        </div>

        {company.tags && company.tags.length > 0 && (
          <div className="gcp-detail-card">
            <h3>Tags</h3>
            <div className="gcp-tags">
              {company.tags.map((tag: string) => (
                <span key={tag} className="gcp-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Status explanation */}
      <section className="gcp-status-info">
        {company.profile_status === 'unclaimed' && (
          <div className="gcp-info-box gcp-info-unclaimed">
            <Shield size={18}/>
            <div>
              <h4>This is an unclaimed profile</h4>
              <p>This profile was created by OUTBIDLY for informational purposes. If you are an authorized representative of {company.name}, you can <Link href={`/claim-business/${company.slug}`}>claim this business</Link> to verify and manage this listing.</p>
            </div>
          </div>
        )}
        {company.profile_status === 'verified' && (
          <div className="gcp-info-box gcp-info-verified">
            <Shield size={18}/>
            <div>
              <h4>This is a verified business</h4>
              <p>This profile has been verified by OUTBIDLY as being managed by an authorized representative of {company.name}.</p>
            </div>
          </div>
        )}
      </section>

      {/* Competition CTA */}
      <section className="gcp-competition-cta">
        <h3>Want your business on the competition leaderboard?</h3>
        <p>OUTBIDLY is the platform for ambitious businesses. Register your business for free, get approved, and compete for visibility on the live rankings.</p>
        <Link href="/register" className="btn-gold">Register your business free →</Link>
      </section>

      {/* Disclaimer */}
      <section className="gbd-disclaimer">
        <p><strong>Disclaimer:</strong> This profile is an independently created directory listing by OUTBIDLY for informational purposes. It does not imply company participation, authorization, sponsorship, or endorsement by {company.name}. Company names, logos and descriptions are used for identification purposes only.</p>
      </section>
    </div>
  );
}
