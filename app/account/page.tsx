import Link from 'next/link';
import {redirect} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import {updateAccount,changePassword} from '@/app/actions';
export const metadata={title:'Account settings',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}){
 const q=await searchParams;const db=await supabase();
 if(!db)redirect('/login?error=Service+not+configured');
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)redirect('/login?error=Please+sign+in');
 return <><div className="page-hero"><div className="wrap"><div className="eyebrow">✦ YOUR ACCOUNT</div><h1>Account <em>settings.</em></h1><p>Keep your details up to date and manage your password.</p><Link className="text-link" style={{display:'inline-flex'}} href="/dashboard">← Back to dashboard</Link></div></div>
 <div className="wrap page-body">{q.error&&<p className="form-error" role="alert">{q.error}</p>}{q.message&&<p className="form-success" role="status">{q.message}</p>}
 <div className="content-card form-card" style={{margin:'0 0 20px',maxWidth:600}}><h2>Personal details</h2><p>Your email address is {user.email}. Email changes are not yet supported here.</p><form action={updateAccount}><label htmlFor="name">Full name</label><input id="name" name="name" defaultValue={user.user_metadata?.name||''} minLength={2} maxLength={100} required/><label htmlFor="phone">Phone number with country code</label><input id="phone" name="phone" type="tel" defaultValue={user.user_metadata?.phone||''} placeholder="+234..." pattern="\+[1-9][0-9]{6,14}" title="Use international format, such as +234 followed by the number, without spaces" required/><button className="button dark">Save details</button></form></div>
 <div className="content-card form-card" style={{margin:'0',maxWidth:600}}><h2>Change password</h2><p>Choose a password of at least eight characters.</p><form action={changePassword}><label htmlFor="current-password">Current password</label><input id="current-password" name="current" type="password" autoComplete="current-password" required/><label htmlFor="new-password">New password</label><input id="new-password" name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required/><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" name="confirm" type="password" minLength={8} maxLength={128} autoComplete="new-password" required/><button className="button dark">Update password</button></form></div></div></>;
}
