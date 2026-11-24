import Link from 'next/link';
import {ArrowUpRight, Crown, Flame, Globe2, Search, Sparkles, TrendingUp, Trophy, Zap} from 'lucide-react';
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
  const result = db && !needsLocation ? await db.rpc('public_leaderboard_with_rank',{
    p_category:category, p_period:period, p_scope:scope,
    p_country:country || null, p_city:city || null, p_search:search || null,
  }) : null;
  const leaders: (Leader & {rank:number})[] = result?.data || [];
  const profilesResult = db && leaders.length ? await db.from('businesses').select('id,description,logo_url').in('id',leaders.map(x=>x.business_id)) : null;
  const profiles = new Map<string,Profile>((profilesResult?.data || []).map(p=>[p.id,p]));
  const unavailable = !db || !!result?.error || !!profilesResult?.error;
  const periodLink = (value:string) => {
    const params = new URLSearchParams({category,period:value,scope});
    if (country) params.set('country',country);
    if (city) params.set('city',city);
    if (search) params.set('search',search);
    return '/?'+params.toString();
  };
  const filledSlots = leaders.length;
  const topTenSlots = 10;
  const openSlots = topTenSlots - Math.min(filledSlots, topTenSlots);

  return <div className="landing">
    {/* Top bar — pay to rank */}
    <div className="landing-ribbon">
      <span><Zap size={13}/> <strong>REGISTER FREE · PAY TO STAY VISIBLE</strong></span>
      <span>Your business gets discovered on the leaderboard. Keep paying to stay on top.</span>
      <Link href="/register" className="landing-ribbon-cta">Register free <ArrowUpRight size={13}/></Link>
    </div>

    {/* Hero — the leaderboard IS the hero */}
    <section className="landing-hero">
      <div className="landing-hero-inner">
        <div className="landing-hero-left">
          <div className="landing-eyebrow"><Trophy size={14}/> LIVE LEADERBOARD</div>
          <h1>Register free.<br/><em>Bid to stay on top.</em></h1>
          <p>Your business gets a free profile and appears on the leaderboard. Pay to boost your position and stay visible to customers. The more you invest, the higher you climb.</p>
          <div className="landing-hero-stats">
            <div><span className="landing-stat-num">₦0</span><span className="landing-stat-label">Registration</span></div>
            <div><span className="landing-stat-num">{openSlots > 0 ? openSlots : 0}</span><span className="landing-stat-label">Open top-10 spots</span></div>
            <div><span className="landing-stat-num">₦2k</span><span className="landing-stat-label">Starts from</span></div>
          </div>
          <div className="landing-hero-actions">
            <Link className="btn-gold" href="/register"><Flame size={15}/> Register & get visible</Link>
            <Link className="btn-ghost" href="#leaderboard">See who's ranked</Link>
          </div>
        </div>
        <div className="landing-hero-right">
          <div className="landing-mini-board">
            <div className="landing-mini-header">
              <span><Crown size={14}/> Top 10 — {category}</span>
              <span className="landing-live-dot"/>
            </div>
            {unavailable ? <div className="landing-mini-empty">Rankings loading...</div> :
             leaders.length === 0 ? <div className="landing-mini-empty">
              <p>No businesses ranked yet in this category.</p>
              <Link href="/register" className="btn-gold-sm">Be the first →</Link>
             </div> :
             <ol className="landing-mini-list">
              {leaders.slice(0,5).map((leader,i) => {
                const profile = profiles.get(leader.business_id);
                return <li key={leader.business_id} className={i===0?'landing-mini-first':''}>
                  <span className="landing-mini-rank">{leader.rank <= 3 ? ['🥇','🥈','🥉'][leader.rank-1] : '#'+leader.rank}</span>
                  <span className="landing-mini-name">{leader.name}</span>
                  <span className="landing-mini-total">{leader.currency} {Number(leader.total).toLocaleString()}</span>
                </li>;
              })}
              {Array.from({length: Math.max(0, 5 - leaders.length)}).map((_,i) =>
                <li key="empty" className="landing-mini-open">
                  <span className="landing-mini-rank">#{leaders.length + i + 1}</span>
                  <span className="landing-mini-name" style={{color:'#b8a87a'}}>Open spot</span>
                  <Link href="/register" className="landing-mini-claim">Claim →</Link>
                </li>
              )}
             </ol>}
          </div>
        </div>
      </div>
    </section>

    {/* Full leaderboard section */}
    <section className="landing-board" id="leaderboard">
      <div className="landing-board-head">
        <div>
          <div className="eyebrow">✦ THE STANDINGS</div>
          <h2>Who's <em>on top right now.</em></h2>
          <p>These businesses registered free — then paid to climb and stay visible. Top 10 earn badges. Will you overtake them?</p>
        </div>
        <Link className="btn-dark-sm" href="/register"><Sparkles size={14}/> Register free →</Link>
      </div>

      {/* Filters */}
      <div className="landing-filters">
        <nav className="landing-tabs">{periods.map(p=><Link key={p.value} href={periodLink(p.value)} className={period===p.value?'on':''}>{p.label}</Link>)}</nav>
        <form action="/" className="landing-filter-row">
          <input type="hidden" name="period" value={period}/>
          <select name="category" defaultValue={category} aria-label="Category">{!names.includes(category)&&<option value={category}>{category}</option>}{names.map(n=><option key={n}>{n}</option>)}</select>
          <select name="scope" defaultValue={scope} aria-label="Scope"><option value="global">Global</option><option value="country">Country</option><option value="city">City</option></select>
          <input name="country" defaultValue={country} placeholder="Country"/>
          <input name="city" defaultValue={city} placeholder="City"/>
          <input name="search" defaultValue={search} placeholder="Search..."/>
          <button type="submit" className="btn-apply"><Search size={14}/> Go</button>
        </form>
      </div>

      {/* Board */}
      <div className="landing-panel">
        <div className="landing-panel-top">
          <div><Trophy size={18}/> <strong>{category}</strong> · {scope==='global'?'Global':scope==='country'?country||'Country':[city,country].filter(Boolean).join(', ')||'City'} · {periods.find(p=>p.value===period)?.label}</div>
          <span className="landing-live-badge"><span className="landing-live-dot-sm"/>LIVE</span>
        </div>

        {needsLocation ? <div className="landing-empty"><Globe2 size={28}/><h3>Choose a location</h3><p>Select a country or city above to see local rankings.</p></div> :
         unavailable ? <div className="landing-empty"><Trophy size={28}/><h3>Rankings temporarily unavailable</h3><p>Please try again shortly.</p></div> :
         leaders.length === 0 ? <div className="landing-empty">
          <Crown size={32}/>
          <h3>The top spot is wide open.</h3>
          <p>Register free, get approved, then pay to climb the leaderboard. Starting at just ₦2,000 — stay visible to customers or drop as others overtake you.</p>
          <Link href="/register" className="btn-gold">Claim the #1 spot →</Link>
         </div> :
         <div className="landing-rows">
          {leaders.map((leader) => {
            const profile = profiles.get(leader.business_id);
            const logo = profile?.logo_url && db ? (profile.logo_url.startsWith('https://') ? profile.logo_url : db.storage.from('business-logos').getPublicUrl(profile.logo_url).data.publicUrl) : null;
            const rank = leader.rank;
            const tier = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : rank <= 10 ? 'top10' : '';
            return <Link href={'/business/'+leader.slug} className={'landing-row landing-row-'+tier} key={leader.business_id}>
              <div className={'landing-row-medal'+(tier?' landing-medal-'+tier:'')}>
                {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : <span>#{rank}</span>}
              </div>
              <div className="landing-row-avatar">
                {logo ? <img src={logo} alt=""/> : leader.name.slice(0,1).toUpperCase()}
              </div>
              <div className="landing-row-info">
                <span className="landing-row-name">{leader.name} <ArrowUpRight size={12}/></span>
                {profile?.description && <span className="landing-row-desc">{profile.description}</span>}
                <span className="landing-row-loc">{leader.city}, {leader.country}</span>
              </div>
              <div className="landing-row-right">
                <span className="landing-row-amount">{leader.currency} {Number(leader.total).toLocaleString('en-NG',{minimumFractionDigits:2})}</span>
                {rank <= 3 && <span className={'landing-row-badge landing-badge-'+tier}>{rank===1?'GOLD #1':rank===2?'SILVER #2':'BRONZE #3'}</span>}
              </div>
            </Link>;
          })}
          {/* Open spots teaser */}
          {openSlots > 0 && leaders.length < 10 && Array.from({length: openSlots}).map((_,i) =>
            <div className="landing-row landing-row-open" key={'open-'+i}>
              <div className="landing-row-medal"><span>#{leaders.length + i + 1}</span></div>
              <div className="landing-row-avatar landing-row-avatar-empty">?</div>
              <div className="landing-row-info">
                <span className="landing-row-name" style={{color:'#b8a87a'}}>Open spot</span>
                <span className="landing-row-loc">This position is available</span>
              </div>
              <div className="landing-row-right">
                <Link href="/register" className="landing-row-claim">Claim this rank →</Link>
              </div>
            </div>
          )}
         </div>
        }
      </div>

      {/* Ranking explainer */}
      <div className="landing-explainer">
        <div><Sparkles size={15}/> Rankings are based on total verified payments received — not quality or endorsements. Each verified payment counts once across global, country and city periods.</div>
      </div>
    </section>

    {/* Pay to Rank CTA band */}
    <section className="landing-cta-band">
      <div className="landing-cta-inner">
        <div>
          <h2>Pay to stay visible. <em>Get discovered.</em></h2>
          <p>Your business gets a free profile on OUTBIDLY. But to stay on the leaderboard and be seen by customers, you need verified payments. Every payment boosts your ranking. Keep investing to maintain your position — or drop down as others overtake you.</p>
        </div>
        <div className="landing-cta-pricing">
          <div className="landing-price-card">
            <div className="landing-price-tag">₦2,000</div>
            <div className="landing-price-label">Minimum to rank</div>
            <ul>
              <li>✓ Get on the leaderboard</li>
              <li>✓ Appear in search results</li>
              <li>✓ Get discovered by customers</li>
              <li>✓ Earn a top-10 badge</li>
              <li>✓ Keep paying to stay on top</li>
            </ul>
            <Link href="/register" className="btn-gold-lg">Register free & start →</Link>
          </div>
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="landing-how">
      <div className="landing-how-head">
        <div className="eyebrow">✦ HOW IT WORKS</div>
        <h2>Three steps to <em>the top.</em></h2>
      </div>
      <div className="landing-steps">
        <div><span>01</span><h3>Register free</h3><p>Create your business profile at no cost. No website needed.</p></div>
        <div className="landing-step-arrow">→</div>
        <div><span>02</span><h3>Get approved & listed</h3><p>Our team reviews your business, then you appear on the leaderboard.</p></div>
        <div className="landing-step-arrow">→</div>
        <div><span>03</span><h3>Pay to climb & stay visible</h3><p>Receive verified payments to boost your rank. Keep investing to maintain your position.</p></div>
      </div>
      <Link href="/register" className="btn-gold" style={{marginTop:30}}>Register free — get discovered →</Link>
    </section>
  </div>;
}
