import {redirect} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import {review,manageCategory} from '@/app/actions';
export const metadata={title:'Admin',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}){
 const q=await searchParams;const db=await supabase();if(!db)redirect('/login');
 const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {data:role,error:roleError}=await db.from('user_roles').select('role').eq('user_id',user.id).eq('role','admin').maybeSingle();
 if(roleError)return <div className="wrap page-body"><h1>Service unavailable.</h1><p>Unable to verify administrative access. Please try again.</p></div>;
 if(!role)return <div className="wrap page-body"><h1>Access denied.</h1></div>;
 const [businessResult,categoryResult]=await Promise.all([
  db.from('businesses').select('*').in('status',['pending','approved','rejected','suspended']).order('created_at',{ascending:false}),
  db.from('categories').select('id,name,description,active').order('name')
 ]);
 return <div className="wrap page-body"><div className="eyebrow">✦ ADMINISTRATION</div><h1 style={{fontSize:38}}>Business <em>reviews.</em></h1><p>Review submitted listings and record the reason for each decision.</p>
 {q.error&&<p className="form-error" role="alert">{q.error}</p>}{q.message&&<p className="form-success">{q.message}</p>}
 {businessResult.error&&<p className="form-error">Businesses could not be loaded.</p>}
 {businessResult.data?.map(b=><div className="content-card" style={{marginBottom:14}} key={b.id}><h3>{b.name} · {b.status}</h3><p>{b.city}, {b.country} · {b.business_type}</p><p>{b.description}</p><p>{b.address} · {b.email} · {b.phone}</p>{b.logo_url&&<img src={b.logo_url.startsWith('https://')?b.logo_url:db.storage.from('business-logos').getPublicUrl(b.logo_url).data.publicUrl} alt={'Logo of '+b.name} width="90"/>}<form action={review} className="filters"><input type="hidden" name="id" value={b.id}/><select name="status" aria-label="Decision"><option value="approved">Approve</option><option value="rejected">Reject</option><option value="suspended">Suspend</option></select><input name="note" placeholder="Reason or internal note" aria-label="Reason or internal note" required/><button className="button dark">Record decision</button></form></div>)}
 {!businessResult.error&&!businessResult.data?.length&&<div className="content-card">No businesses to review.</div>}
 <section style={{marginTop:50}}><div className="eyebrow">✦ INDUSTRIES</div><h2>Manage categories</h2><p>Category changes are recorded with an administrator and reason. Deactivating a category preserves its history.</p>
 <details className="content-card"><summary>Add a category</summary><form action={manageCategory} className="form-card"><label>Category name</label><input name="name" minLength={2} maxLength={120} required/><label>Description</label><textarea name="description" rows={2}/><label>Status</label><select name="active" defaultValue="true"><option value="true">Active</option><option value="false">Inactive</option></select><label>Reason for change</label><input name="reason" required/><button className="button dark">Create category</button></form></details>
 {categoryResult.error&&<p className="form-error">Categories could not be loaded.</p>}
 {categoryResult.data?.map(c=><details className="content-card" key={c.id} style={{marginTop:10}}><summary>{c.name} · {c.active?'Active':'Inactive'}</summary><form action={manageCategory} className="form-card"><input type="hidden" name="id" value={c.id}/><label>Category name</label><input name="name" defaultValue={c.name} minLength={2} maxLength={120} required/><label>Description</label><textarea name="description" defaultValue={c.description||''} rows={2}/><label>Status</label><select name="active" defaultValue={String(c.active)}><option value="true">Active</option><option value="false">Inactive</option></select><label>Reason for change</label><input name="reason" required/><button className="button dark">Save category</button></form></details>)}
 </section></div>;
}
