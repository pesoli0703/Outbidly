import Link from 'next/link';
import {ArrowDownRight, ArrowRight, ArrowUpRight, Globe2, Search, ShieldCheck, Sparkles, Trophy} from 'lucide-react';
import {categories as fallbackCategories} from '@/lib/categories';
import {supabase} from '@/lib/supabase';

type SearchParams = {category?:string; period?:string; scope?:string; country?:string; city?:string; search?:string};
type Leader = {business_id:string; name:string; slug:string; city:string; country:string; currency:string; total:string | number};
type Profile = {id:string; description:string; logo_url:string | null};
const periods = [{value:'lifetime',label:'All time'}, {value:'daily',label:'Today'}, {value:'weekly',label:'This week'}, {value:'monthly',label:'This month'}] as const;

export default async function HomePage({searchParams}:{searchParams:Promise<SearchParams>}) {
  const q = await searchParams;
  const period = periods.some(p=>p.value===q.period) ? q.period! : 'lifetime';
  const scope = ['global','country','city'].includes(q.scope || '') ? q.scope! : 'global';
  const category = q.category || 'Fashion Designers';
  const country = q.country?.trim() || '';
  const city = q.city?.trim() || '';
  const search = q.search?.trim() || '';
  const needsLocation = scope !== 'global' && (!country || (scope === 'city' && !city));
  const db = await supabase();
  const categoryResult = db ? await db.from('categories').select('name').eq('active',true).order('name') : null;
  const names = categoryResult?.data?.map(item=>item.name) ?? fallbackCategories;
  const result = db && !needsLocation ? await db.rpc('public_leaderboard',{
    p_category:category, p_period:period, p_scope:scope,
    p_country:country || null, p_city:city || null, p_search:search || null,
  }) : null;
  const leaders: Leader[] = result?.data || [];
  const profilesResult = db && leaders.length ? await db.from('public_businesses').select('id,description,logo_url').in('id',leaders.map(x=>x.business_id)) : null;
  const profiles = new Map<string,Profile>((profilesResult?.data || []).map(p=>[p.id,p]));
  const unavailable = !db || !!result?.error || !!profilesResult?.error;
  const periodLink = (value:string) => {
    const params = new URLSearchParams({category,period:value,scope});
    if (country) params.set('country',country);
    if (city) params.set('city',city);
    if (search) params.set('search',search);
    return '/?'+params.toString()+'#leaderboard';
  };
  return <div className="board-home">
    <section className="board-intro board-width">
      <div className="board-kicker"><span className="board-kicker-dot"/> THE BUSINESS VISIBILITY LEADERBOARD</div>
      <h1>Make your business <em>impossible to miss.</em></h1>
      <p>Discover ambitious businesses and explore the rankings, from your city to the world.</p>
      <div className="board-intro-actions"><Link className="button board-primary" href="/register">Register your business <ArrowUpRight size={16}/></Link><Link href="/about" className="board-learn">How OUTBIDLY works <ArrowRight size={15}/></Link></div>
      <div className="board-free"><ShieldCheck size={15}/> Free to register <span>·</span> No website required</div>
    </section>

    <section className="board-width board-main" id="leaderboard" aria-labelledby="leaderboard-heading">
      <div className="board-heading"><div><div className="eyebrow">✦ DISCOVER THE LEADERBOARD</div><h2 id="leaderboard-heading">The businesses <em>making moves.</em></h2><p>See the standings in your industry, wherever you are.</p></div><Link className="board-directory-link" href="/businesses">Explore businesses <ArrowUpRight size={16}/></Link></div>
      <nav className="board-tabs" aria-label="Ranking period">{periods.map(p=><Link key={p.value} href={periodLink(p.value)} className={period===p.value?'selected':''} aria-current={period===p.value?'page':undefined}>{p.label}</Link>)}</nav>
      <form action="/#leaderboard" className="board-filter">
        <input type="hidden" name="period" value={period}/>
        <label>Category<select name="category" defaultValue={category}>{!names.includes(category)&&<option value={category}>{category}</option>}{names.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
        <label>Location<select name="scope" defaultValue={scope}><option value="global">Global</option><option value="country">Country</option><option value="city">City</option></select></label>
        <label>Country<input name="country" defaultValue={country} placeholder="e.g. Nigeria"/></label>
        <label>City<input name="city" defaultValue={city} placeholder="e.g. Lagos"/></label>
        <label className="board-search">Search<input name="search" defaultValue={search} placeholder="Business name"/></label>
        <button className="button board-filter-button" type="submit"><Search size={15}/> Apply</button>
      </form>
      <div className="board-explainer"><ShieldCheck size={17}/><span>Rankings reflect accumulated verified payments—not quality, customer satisfaction or endorsement. One payment counts across the relevant city, country and global periods.</span></div>
      <div className="board-panel">
        <div className="board-panel-header"><div><span className="board-panel-icon"><Trophy size={19}/></span><div><strong>{category}</strong><small>{scope === 'global' ? 'Global' : scope === 'country' ? country || 'Choose a country' : [city,country].filter(Boolean).join(', ') || 'Choose a city'} · {periods.find(p=>p.value===period)?.label} · UTC</small></div></div><Link href={periodLink(period)} className="board-refresh">Refresh ↻</Link></div>
        {needsLocation ? <div className="board-empty"><span className="board-empty-icon"><Globe2 size={25}/></span><h3>Choose a location to explore.</h3><p>Enter {scope==='city'?'a country and city':'a country'} above and apply your filters.</p></div> : unavailable ? <div className="board-empty"><span className="board-empty-icon"><Trophy size={25}/></span><h3>Rankings are temporarily unavailable.</h3><p>Please try again a little later.</p></div> : leaders.length===0 ? <div className="board-empty"><span className="board-empty-icon"><Trophy size={25}/></span><h3>There’s room at the top.</h3><p>No verified contributions for this view yet. Explore another category or register your business for free.</p><Link href="/register" className="button board-empty-button">Register your business <ArrowUpRight size={15}/></Link></div> : <ol className="board-list">{leaders.map((leader,index)=>{
          const profile=profiles.get(leader.business_id);
          const logo=profile?.logo_url && db ? (profile.logo_url.startsWith('https://') ? profile.logo_url : db.storage.from('business-logos').getPublicUrl(profile.logo_url).data.publicUrl) : null;
          return <li className={'board-entry '+(index===0?'board-first':'')} key={leader.business_id}><span className="board-rank">#{index+1}</span><span className="board-avatar">{logo?<img src={logo} alt=""/>:leader.name.slice(0,1).toUpperCase()}</span><div className="board-entry-text"><Link href={'/business/'+leader.slug}>{leader.name} <ArrowUpRight size={14}/></Link>{profile?.description&&<p>{profile.description}</p>}<small>{leader.city}, {leader.country}</small></div><strong className="board-total">{leader.currency} {leader.total}</strong></li>;
        })}</ol>}
      </div>
      <div className="board-payment-note"><span><Sparkles size={16}/> Ranking payments are not available yet.</span><Link href="/faq">Read the FAQs <ArrowUpRight size={14}/></Link></div>
    </section>

    <section className="board-how board-width" id="how-it-works"><div><div className="eyebrow">✦ GET DISCOVERED</div><h2>A little visibility.<br/><em>A lot of opportunity.</em></h2><p>Start with a free business profile. Once approved, it can be discovered by customers near and far.</p><Link href="/register" className="board-how-link">Create your profile <ArrowUpRight size={17}/></Link></div><div className="board-how-steps"><div><span>01</span><p><strong>Create a profile</strong>Share your business and choose your categories.</p><ArrowDownRight size={18}/></div><div><span>02</span><p><strong>Get approved</strong>Our team reviews your business before publication.</p><ArrowDownRight size={18}/></div><div><span>03</span><p><strong>Get discovered</strong>Your approved profile appears in the business directory.</p><ArrowUpRight size={18}/></div></div></section>
  </div>;
}
