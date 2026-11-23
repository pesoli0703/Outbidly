import {redirect} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import {review,manageCategory} from '@/app/actions';
import {reviewClaim} from './actions';
export const metadata={title:'Admin',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{error?:string;message?:string;tab?:string}>}){
 const q=await searchParams;const db=await supabase();if(!db)redirect('/login');
 const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {data:role}=await db.from('user_roles').select('role').eq('user_id',user.id).eq('role','admin').maybeSingle();
 if(!role)return <div className="wrap page-body"><h1>Access denied.</h1></div>;
 const [businessResult,categoryResult,companiesResult,claimsResult,industriesResult]=await Promise.all([
  db.from('businesses').select('*').in('status',['pending','approved','rejected','suspended']).order('created_at',{ascending:false}),
  db.from('categories').select('id,name,description,active').order('name'),
  db.from('global_companies').select('*,global_industries(name)').order('is_featured',{ascending:false}).order('name'),
  db.from('company_claims').select('*,global_companies(name,slug)').order('created_at',{ascending:false}),
  db.from('global_industries').select('*').order('display_order'),
 ]);
 const tab=q.tab||'businesses';
 return <div className="wrap page-body">
 <div className="eyebrow">✦ ADMINISTRATION</div><h1 style={{fontSize:38}}>Admin <em>Dashboard</em></h1>
 {q.error&&<p className="form-error" role="alert">{q.error}</p>}{q.message&&<p className="form-success">{q.message}</p>}

 {/* Tab navigation */}
 <nav style={{display:'flex',gap:8,margin:'20px 0',borderBottom:'1px solid #e5e7e5',paddingBottom:0}}>
  <a href="/admin?tab=businesses" style={{padding:'12px 18px',fontWeight:700,fontSize:13,borderBottom:tab==='businesses'?'2px solid #c49a58':'2px solid transparent',color:tab==='businesses'?'#182b3a':'#84908e'}}>Business Reviews</a>
  <a href="/admin?tab=claims" style={{padding:'12px 18px',fontWeight:700,fontSize:13,borderBottom:tab==='claims'?'2px solid #c49a58':'2px solid transparent',color:tab==='claims'?'#182b3a':'#84908e'}}>Claim Requests {claimsResult.data?.filter(c=>c.status==='pending').length?`(${claimsResult.data?.filter(c=>c.status==='pending').length})`:''}</a>
  <a href="/admin?tab=directory" style={{padding:'12px 18px',fontWeight:700,fontSize:13,borderBottom:tab==='directory'?'2px solid #c49a58':'2px solid transparent',color:tab==='directory'?'#182b3a':'#84908e'}}>Global Directory</a>
  <a href="/admin?tab=industries" style={{padding:'12px 18px',fontWeight:700,fontSize:13,borderBottom:tab==='industries'?'2px solid #c49a58':'2px solid transparent',color:tab==='industries'?'#182b3a':'#84908e'}}>Directory Categories</a>
  <a href="/admin?tab=categories" style={{padding:'12px 18px',fontWeight:700,fontSize:13,borderBottom:tab==='categories'?'2px solid #c49a58':'2px solid transparent',color:tab==='categories'?'#182b3a':'#84908e'}}>Competition Categories</a>
 </nav>

 {/* Business Reviews Tab */}
 {tab==='businesses' && <section>
  <h2>Business <em>reviews.</em></h2><p>Review submitted listings and record the reason for each decision.</p>
  {businessResult.error&&<p className="form-error">Businesses could not be loaded.</p>}
  {businessResult.data?.map(b=><div className="content-card" style={{marginBottom:14}} key={b.id}><h3>{b.name} · {b.status}</h3><p>{b.city}, {b.country} · {b.business_type}</p><p>{b.description}</p><p>{b.address} · {b.email} · {b.phone}</p>{b.logo_url&&<img src={b.logo_url.startsWith('https://')?b.logo_url:db.storage.from('business-logos').getPublicUrl(b.logo_url).data.publicUrl} alt="" width="90" style={{marginTop:8}}/>}<form action={review} className="filters" style={{marginTop:10}}><input type="hidden" name="id" value={b.id}/><select name="status" aria-label="Decision"><option value="approved">Approve</option><option value="rejected">Reject</option><option value="suspended">Suspend</option></select><input name="note" placeholder="Reason or internal note" aria-label="Reason" required/><button className="button dark">Record decision</button></form></div>)}
  {!businessResult.error&&!businessResult.data?.length&&<div className="content-card">No businesses to review.</div>}
 </section>}

 {/* Claim Requests Tab */}
 {tab==='claims' && <section>
  <h2>Business <em>claim requests.</em></h2><p>Review claims from company representatives requesting to verify their business profiles.</p>
  {claimsResult.error&&<p className="form-error">Claims could not be loaded.</p>}
  {claimsResult.data?.map(c=><div className="content-card" style={{marginBottom:14,borderLeft:c.status==='pending'?'4px solid #c49a58':c.status==='approved'?'4px solid #4ade80':'4px solid #ef4444'}} key={c.id}>
   <h3 style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>{(c.global_companies as any)?.name || 'Unknown'} <span style={{fontSize:11,padding:'3px 10px',borderRadius:4,background:c.status==='pending'?'#fef3c7':c.status==='approved'?'#dcfce7':'#fee2e2',color:c.status==='pending'?'#92400e':c.status==='approved'?'#166534':'#991b1b'}}>{c.status.toUpperCase()}</span></h3>
   <p><strong>Claimant:</strong> {c.claimant_name} — {c.claimant_position}</p>
   <p><strong>Email:</strong> {c.claimant_email}</p>
   {c.company_website&&<p><strong>Website:</strong> {c.company_website}</p>}
   {c.verification_notes&&<p><strong>Notes:</strong> {c.verification_notes}</p>}
   <p style={{fontSize:11,color:'#8a9698'}}>Submitted: {new Date(c.created_at).toLocaleString()}</p>
   {c.status==='pending' && <form action={reviewClaim} style={{marginTop:10,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
    <input type="hidden" name="claim_id" value={c.id}/>
    <input name="review_notes" placeholder="Review notes" required style={{flex:1,minWidth:200}}/>
    <button name="action" value="approve" className="button gold" style={{padding:'10px 18px'}}>Approve</button>
    <button name="action" value="reject" className="button outline" style={{padding:'10px 18px',color:'#ef4444',borderColor:'#ef4444'}}>Reject</button>
   </form>}
   {c.review_notes&&<p style={{fontSize:11,marginTop:8}}><strong>Review:</strong> {c.review_notes}</p>}
  </div>)}
  {!claimsResult.error&&!claimsResult.data?.length&&<div className="content-card">No claim requests yet.</div>}
 </section>}

 {/* Global Directory Tab */}
 {tab==='directory' && <section>
  <h2>Global <em>directory.</em></h2><p>Manage international company profiles in the Global Business Directory.</p>
  {companiesResult.data?.map(c=><details className="content-card" style={{marginBottom:10}} key={c.id}>
   <summary style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
    <span><strong>{c.name}</strong> — {(c.global_industries as any)?.name || 'No industry'} — {c.country} <span style={{fontSize:10,padding:'2px 8px',borderRadius:3,background:c.profile_status==='verified'?'#dcfce7':c.profile_status==='claimed'?'#fef3c7':'#f1f5f9',color:c.profile_status==='verified'?'#166534':c.profile_status==='claimed'?'#92400e':'#475569',marginLeft:8}}>{c.profile_status}</span></span>
   </summary>
   <div style={{padding:15,marginTop:10}}>
    <p>{c.description}</p>
    {c.website&&<p><a href={c.website} target="_blank" rel="noopener noreferrer">{c.website}</a></p>}
    <p>Founded: {c.founded_year||'Unknown'} · HQ: {c.headquarters||'Unknown'}</p>
    <p>Tags: {c.tags?.join(', ')||'None'}</p>
    <p>Featured: {c.is_featured?'Yes':'No'}</p>
   </div>
  </details>)}
 </section>}

 {/* Directory Industries Tab */}
 {tab==='industries' && <section>
  <h2>Directory <em>industries.</em></h2><p>Manage the industry categories for the Global Business Directory.</p>
  {industriesResult.data?.map(i=><div className="content-card" style={{marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}} key={i.id}>
   <div><strong>{i.name}</strong><br/><span style={{fontSize:11,color:'#8a9698'}}>{i.description||'No description'}</span></div>
   <span style={{fontSize:11,padding:'3px 8px',borderRadius:3,background:i.active?'#dcfce7':'#fee2e2',color:i.active?'#166534':'#991b1b'}}>{i.active?'Active':'Inactive'}</span>
  </div>)}
 </section>}

 {/* Competition Categories Tab */}
 {tab==='categories' && <section>
  <div className="eyebrow">✦ COMPETITION CATEGORIES</div><h2>Manage competition categories</h2><p>These categories are used for the active competition leaderboard.</p>
  <details className="content-card"><summary>Add a category</summary><form action={manageCategory} className="form-card"><label>Category name</label><input name="name" minLength={2} maxLength={120} required/><label>Description</label><textarea name="description" rows={2}/><label>Status</label><select name="active" defaultValue="true"><option value="true">Active</option><option value="false">Inactive</option></select><label>Reason for change</label><input name="reason" required/><button className="button dark">Create category</button></form></details>
  {categoryResult.data?.map(c=><details className="content-card" key={c.id} style={{marginTop:10}}><summary>{c.name} · {c.active?'Active':'Inactive'}</summary><form action={manageCategory} className="form-card"><input type="hidden" name="id" value={c.id}/><label>Category name</label><input name="name" defaultValue={c.name} minLength={2} maxLength={120} required/><label>Description</label><textarea name="description" defaultValue={c.description||''} rows={2}/><label>Status</label><select name="active" defaultValue={String(c.active)}><option value="true">Active</option><option value="false">Inactive</option></select><label>Reason for change</label><input name="reason" required/><button className="button dark">Save category</button></form></details>)}
 </section>}
 </div>;
}
