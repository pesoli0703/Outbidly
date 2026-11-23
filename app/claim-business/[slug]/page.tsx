import {notFound} from 'next/navigation';
import Link from 'next/link';
import {Shield, ArrowLeft} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {submitClaim} from './actions';

export async function generateMetadata({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const db = await supabase();
  if (!db) return {title: 'Claim Business'};
  const {data} = await db.from('global_companies').select('name').eq('slug', slug).single();
  return {title: `Claim ${data?.name || 'Business'}`};
}

export default async function Page({params, searchParams}: {
  params: Promise<{slug: string}>,
  searchParams: Promise<{success?: string; error?: string}>
}) {
  const {slug} = await params;
  const q = await searchParams;
  const db = await supabase();
  if (!db) notFound();

  const {data: company} = await db
    .from('global_companies')
    .select('name, slug, website, profile_status')
    .eq('slug', slug)
    .single();

  if (!company) notFound();

  if (company.profile_status === 'verified') {
    return (
      <div className="wrap page-body">
        <div className="gcp-breadcrumb">
          <Link href="/global-directory">Global Directory</Link>
          <span>›</span>
          <Link href={`/global-directory/${company.slug}`}>{company.name}</Link>
          <span>›</span>
          <span>Claim</span>
        </div>
        <div className="content-card" style={{textAlign: 'center', padding: '60px 40px'}}>
          <Shield size={40} style={{color: '#4ade80', margin: '0 auto 20px'}}/>
          <h2>This business is already verified</h2>
          <p>{company.name} has already been claimed and verified by an authorized representative.</p>
          <Link href={`/global-directory/${company.slug}`} className="btn-dark-sm" style={{marginTop: 20}}>
            <ArrowLeft size={14}/> View Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap page-body">
      <div className="gcp-breadcrumb">
        <Link href="/global-directory">Global Directory</Link>
        <span>›</span>
        <Link href={`/global-directory/${company.slug}`}>{company.name}</Link>
        <span>›</span>
        <span>Claim</span>
      </div>

      <div className="claim-hero">
        <div className="landing-eyebrow"><Shield size={14}/> CLAIM THIS BUSINESS</div>
        <h1 style={{fontSize: 36}}>Claim <em>{company.name}</em></h1>
        <p>Verify that you are an authorized representative of this company. Once approved, your profile will be marked as verified.</p>
      </div>

      {q.error && <div className="content-card form-error" style={{marginBottom: 20}}>{q.error}</div>}
      {q.success && <div className="content-card form-success" style={{marginBottom: 20}}>{q.success}</div>}

      <div className="claim-grid">
        <div className="claim-form-wrap">
          <form action={submitClaim} className="claim-form">
            <input type="hidden" name="company_id" value={company.slug}/>

            <h3>Your Information</h3>
            <label>Full Name *</label>
            <input name="claimant_name" required placeholder="Your full name"/>

            <label>Official Company Email *</label>
            <input name="claimant_email" type="email" required placeholder="name@company.com"/>
            <p className="claim-hint">Use your official company email domain (not Gmail, Yahoo, etc.)</p>

            <label>Position / Title *</label>
            <input name="claimant_position" required placeholder="e.g. CEO, Marketing Director, Owner"/>

            <h3 style={{marginTop: 30}}>Company Information</h3>
            <label>Company Website</label>
            <input name="company_website" type="url" defaultValue={company.website || ''} placeholder="https://"/>

            <label>Verification Notes</label>
            <textarea name="verification_notes" rows={4} placeholder="Provide any additional information that can help us verify your claim (registration numbers, authorization letters, etc.)"/>

            <div className="claim-notice">
              <Shield size={16}/>
              <div>
                <strong>What happens next?</strong>
                <p>Our team will review your claim and may request additional verification documents. We will contact you at the email address provided. Claims are typically reviewed within 3-5 business days.</p>
              </div>
            </div>

            <label style={{display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20}}>
              <input type="checkbox" name="declaration" required style={{marginTop: 3}}/>
              <span style={{fontSize: 12, lineHeight: 1.6}}>I declare that I am an authorized representative of {company.name} and that the information provided is true and accurate. I understand that false claims may result in legal action.</span>
            </label>

            <button className="button dark" type="submit" style={{marginTop: 20, width: '100%'}}>Submit Claim Request</button>
          </form>
        </div>

        <div className="claim-sidebar">
          <div className="content-card">
            <h3>Claiming a Business</h3>
            <p>By claiming this business, you will be able to:</p>
            <ul className="claim-benefits">
              <li>✓ Get the verified business badge</li>
              <li>✓ Update company information</li>
              <li>✓ Manage the company profile</li>
              <li>✓ Appear as verified in the directory</li>
            </ul>
          </div>

          <div className="content-card" style={{marginTop: 15}}>
            <h3>Requirements</h3>
            <ul className="claim-requirements">
              <li>Official company email address</li>
              <li>Proof of authorization (if requested)</li>
              <li>Accurate company information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
