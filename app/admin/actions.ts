'use server';
import {redirect} from 'next/navigation';
import {supabase} from '@/lib/supabase';

const text = (f: FormData, k: string) => String(f.get(k) || '').trim();

export async function reviewClaim(f: FormData) {
  const db = await supabase();
  if (!db) redirect('/admin?error=Service+not+configured');

  const {data: {user}} = await db.auth.getUser();
  if (!user) redirect('/login');

  // Verify admin
  const {data: role} = await db.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
  if (!role) redirect('/admin?error=Access+denied');

  const claimId = text(f, 'claim_id');
  const reviewNotes = text(f, 'review_notes');
  const action = text(f, 'action');

  if (!claimId || !reviewNotes) {
    redirect('/admin?tab=claims&error=Please+provide+review+notes');
  }

  const status = action === 'approve' ? 'approved' : 'rejected';

  const {error} = await db.rpc('review_company_claim', {
    p_claim_id: claimId,
    p_status: status,
    p_review_notes: reviewNotes,
    p_reviewer_id: user.id,
  });

  if (error) {
    redirect(`/admin?tab=claims&error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin?tab=claims&message=Claim+${status}+successfully`);
}
