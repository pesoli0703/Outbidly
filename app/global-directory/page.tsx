import Link from 'next/link';
import {ArrowUpRight, Globe, MapPin, Search, Shield, Building} from 'lucide-react';
import {supabase} from '@/lib/supabase';

export const metadata = {title: 'Global Business Directory'};

type Company = {
  id: string;
  name: string;
  slug: string;
  description: string;
  industry_name: string;
  country: string;
  city: string | null;
  website: string;
  logo_url: string | null;
  profile_status: string;
  founded_year: number | null;
  headquarters: string | null;
  tags: string[];
  is_featured: boolean;
};

export default async function Page({searchParams}: {searchParams: Promise<{search?: string; industry?: string; country?: string}>}) {
  const q = await searchParams;
  const db = await supabase();

  // Get industries for filter
  const industriesResult = db ? await db.from('global_industries').select('name').eq('active', true).order('display_order') : null;
  const industries = industriesResult?.data?.map(i => i.name) || [];

  // Get unique countries
  const countriesResult = db ? await db.from('global_companies').select('country').order('country') : null;
  const allCountries = [...new Set(countriesResult?.data?.map(c => c.country) || [])].sort();

  // Search companies
  let companies: Company[] = [];
  if (db) {
    const result = await db.rpc('search_global_companies', {
      p_search: q.search || null,
      p_industry: q.industry || null,
      p_country: q.country || null,
      p_status: null,
    });
    companies = result.data || [];
  }

  // Group by featured
  const featured = companies.filter(c => c.is_featured);
  const others = companies.filter(c => !c.is_featured);

  // African countries for African directory filter
  const africanCountries = ['Nigeria', 'South Africa', 'Kenya', 'Ghana', 'Togo', 'Egypt', 'Morocco', 'Ethiopia', 'Rwanda', 'Tanzania', 'Uganda', 'Senegal', 'Cameroon', 'Côte d\'Ivoire'];
  const africanCompanies = companies.filter(c => africanCountries.includes(c.country));

  return (
    <div className="gbd-page">
      {/* Hero */}
      <section className="gbd-hero">
        <div className="gbd-hero-inner">
          <div className="landing-eyebrow"><Globe size={14}/> GLOBAL BUSINESS DIRECTORY</div>
          <h1>Discover the world's<br/><em>leading businesses.</em></h1>
          <p>Browse verified profiles of international companies. From tech giants to African innovators — explore who's shaping industries across the globe.</p>
          <div className="gbd-hero-stats">
            <div><span className="landing-stat-num">{companies.length}</span><span className="landing-stat-label">Companies listed</span></div>
            <div><span className="landing-stat-num">{industries.length}</span><span className="landing-stat-label">Industries</span></div>
            <div><span className="landing-stat-num">{allCountries.length}</span><span className="landing-stat-label">Countries</span></div>
          </div>
        </div>
      </section>

      {/* Discovery Tabs */}
      <section className="gbd-tabs-section">
        <nav className="gbd-tabs">
          <Link href="/global-directory" className="gbd-tab active"><Globe size={14}/> Global Directory</Link>
          <Link href="/global-directory?filter=africa" className="gbd-tab"><MapPin size={14}/> African Businesses</Link>
          <Link href="/global-directory?filter=nigeria" className="gbd-tab"><MapPin size={14}/> Nigerian Businesses</Link>
          <Link href="/rankings" className="gbd-tab"><Building size={14}/> Competition Rankings</Link>
        </nav>
      </section>

      {/* Search and Filters */}
      <section className="gbd-filters-section">
        <form action="/global-directory" className="gbd-filters">
          <div className="gbd-search-wrap">
            <Search size={16}/>
            <input name="search" defaultValue={q.search} placeholder="Search companies, industries, tags..." className="gbd-search"/>
          </div>
          <select name="industry" defaultValue={q.industry || ''} className="gbd-select">
            <option value="">All industries</option>
            {industries.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select name="country" defaultValue={q.country || ''} className="gbd-select">
            <option value="">All countries</option>
            {allCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="btn-apply"><Search size={14}/> Search</button>
        </form>
      </section>

      {/* Results */}
      <section className="gbd-results">
        {companies.length === 0 ? (
          <div className="gbd-empty">
            <Globe size={32}/>
            <h3>No companies found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <>
                <h2 className="gbd-section-title"><Shield size={16}/> Featured Companies</h2>
                <div className="gbd-grid">
                  {featured.map(company => (
                    <CompanyCard key={company.id} company={company}/>
                  ))}
                </div>
              </>
            )}
            {others.length > 0 && (
              <>
                <h2 className="gbd-section-title">All Companies</h2>
                <div className="gbd-grid">
                  {others.map(company => (
                    <CompanyCard key={company.id} company={company}/>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>

      {/* Disclaimer */}
      <section className="gbd-disclaimer">
        <p><strong>Disclaimer:</strong> These profiles are independently created directory listings by OUTBIDLY for informational purposes. They do not imply company participation, authorization, sponsorship, or endorsement by the listed companies. Company names, logos and descriptions are used for identification purposes only.</p>
      </section>
    </div>
  );
}

function CompanyCard({company}: {company: Company}) {
  return (
    <Link href={`/global-directory/${company.slug}`} className="gbd-card">
      <div className="gbd-card-header">
        <div className="gbd-card-logo">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name}/>
          ) : (
            <span>{company.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        {company.profile_status === 'unclaimed' && (
          <span className="gbd-badge gbd-badge-unclaimed">Unclaimed</span>
        )}
        {company.profile_status === 'verified' && (
          <span className="gbd-badge gbd-badge-verified"><Shield size={10}/> Verified</span>
        )}
      </div>
      <h3 className="gbd-card-name">{company.name} <ArrowUpRight size={13}/></h3>
      {company.description && (
        <p className="gbd-card-desc">{company.description}</p>
      )}
      <div className="gbd-card-meta">
        <span><MapPin size={11}/> {company.city ? `${company.city}, ` : ''}{company.country}</span>
        {company.founded_year && <span>Est. {company.founded_year}</span>}
      </div>
      <div className="gbd-card-industry">{company.industry_name}</div>
    </Link>
  );
}
