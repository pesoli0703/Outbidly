import {redirect} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import {startSandboxCheckout} from './actions';

export const metadata={title:'Test checkout',robots:{index:false,follow:false}};
export const dynamic = 'force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.FLUTTERWAVE_TEST_ENABLED !== 'true') return <div className="wrap page-body"><h1>Test checkout unavailable.</h1><p>Payment testing is currently disabled.</p></div>;
  const db = await supabase(); if (!db) redirect('/login');
  const {data:{user}} = await db.auth.getUser(); if (!user) redirect('/login');
  const [{data:businesses,error:businessError},{data:categories,error:categoryError},payments] = await Promise.all([
    db.from('businesses').select('id,name,country').eq('owner_id',user.id).eq('status','approved').order('name'),
    db.from('categories').select('id,name').eq('active',true).order('name'),
    db.from('sandbox_payment_intents').select('reference,amount,currency,status,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20),
  ]);
  const q = await searchParams;
  return <div className="wrap page-body"><div className="content-card form-card"><h1>Test checkout</h1><p>This is a sandbox. Use Flutterwave test payment details only; test payments never affect public rankings. Only approved Nigerian businesses can be tested here.</p>
    {q.error && <div role="alert" style={{background:'#fee',border:'2px solid #c00',color:'#900',padding:'16px 20px',borderRadius:8,marginBottom:20,fontSize:16,fontWeight:700}}>⚠️ {q.error}</div>}
    {q.message && <p className="form-success" role="status">{q.message}</p>}
    {(businessError || categoryError) ? <p className="form-error">Could not load business details.</p> : <form action={startSandboxCheckout}>
      <label>Business</label><select name="business" required defaultValue=""><option value="" disabled>Select an approved business</option>{businesses?.filter(b=>b.country.trim().toLowerCase()==='nigeria').map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <label>Category</label><select name="category" required defaultValue=""><option value="" disabled>Select a category for this business</option>{categories?.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <label>Amount in NGN</label><input name="amount" inputMode="decimal" placeholder="2000.00" required/>
      <p>Test minimum: ₦2,000 for the first verified test payment to this business and category; ₦500 afterward.</p>
      <label><input type="checkbox" name="policy" value="accepted" required/> I understand payments are non-refundable except where required by law or otherwise stated in the refund policy.</label>
      <button className="button dark">Continue to Flutterwave test checkout</button>
    </form>}
    <section style={{marginTop:32}}><h2>Recent test payments</h2>
      {payments.error ? <p className="form-error">Test payment history is unavailable.</p> : !payments.data?.length ? <p>No test payments yet.</p> : payments.data.map(p=><div className="notice" key={p.reference}><strong>{p.status === 'verified' ? 'Verified test payment' : 'Pending verification'}</strong><p>{p.currency} {Number(p.amount).toFixed(2)} · {new Date(p.created_at).toUTCString()}</p><small>Reference: {p.reference}</small></div>)}
    </section>
  </div></div>;
}
