'use server';
import {redirect} from 'next/navigation';
import {supabase} from '@/lib/supabase';

const text = (f: FormData, k: string) => String(f.get(k) || '').trim();

export async function submitClaim(f: FormData) {
  const db = await supabase();
  if (!db) redirect('/global-directory?error=Service+not+configured');

  const slug = text(f, 'company_id');
  const claimantName = text(f, 'claimant_name');
  const claimantEmail = text(f, 'claimant_email');
  const claimantPosition = text(f, 'claimant_position');
  const companyWebsite = text(f, 'company_website');
  const verificationNotes = text(f, 'verification_notes');

  // Validation
  if (!claimantName || !claimantEmail || !claimantPosition) {
    redirect(`/claim-business/${slug}?error=Please+complete+all+required+fields`);
  }

  // Validate email domain (basic check)
  const emailDomain = claimantEmail.split('@')[1]?.toLowerCase();
  const freeEmails = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
  if (!emailDomain || freeEmails.includes(emailDomain)) {
    redirect(`/claim-business/${slug}?error=Please+use+your+official+company+email+domain`);
  }

  // Look up the company
  const {data: company, error: lookupError} = await db
    .from('global_companies')
    .select('id, profile_status')
    .eq('slug', slug)
    .single();

  if (lookupError || !company) {
    redirect(`/claim-business/${slug}?error=Company+not+found`);
  }

  if (company.profile_status === 'verified') {
    redirect(`/claim-business/${slug}?error=This+business+is+already+verified`);
  }

  // Submit the claim
  const {error} = await db.rpc('submit_company_claim', {
    p_company_id: company.id,
    p_claimant_name: claimantName,
    p_claimant_email: claimantEmail,
    p_claimant_position: claimantPosition,
    p_company_website: companyWebsite || null,
    p_verification_notes: verificationNotes || null,
  });

  if (error) {
    redirect(`/claim-business/${slug}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/claim-business/${slug}?success=Your+claim+has+been+submitted.+We+will+review+it+within+3-5+business+days.`);
}
