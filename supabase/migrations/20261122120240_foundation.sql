-- OUTBIDLY foundation. Financial flows intentionally remain disabled until independently reviewed.
create extension if not exists pgcrypto;
create table public.user_roles (user_id uuid not null references auth.users(id) on delete cascade, role text not null check (role in ('admin')), primary key(user_id,role));
create table public.categories (id uuid primary key default gen_random_uuid(), name text not null unique, active boolean not null default true, description text, created_at timestamptz not null default now());
create table public.businesses (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id), name text not null, slug text not null unique, description text not null, country text not null, city text not null, address text not null, business_type text not null, contact_name text not null, email text not null, phone text not null, website text, logo_url text not null, status text not null default 'pending' check(status in ('draft','pending','approved','rejected','suspended','archived')), created_at timestamptz not null default now());
create table public.business_categories (business_id uuid not null references public.businesses(id), category_id uuid not null references public.categories(id), primary key (business_id,category_id));
create table public.audit_logs (id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users(id), action text not null, subject_id uuid not null, reason text not null, created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), message text not null, read_at timestamptz, created_at timestamptz not null default now());
-- No browser write policies exist for financial records. Payment processing is not implemented.
create table public.payments (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), business_id uuid not null references public.businesses(id), category_id uuid not null references public.categories(id), reference text not null unique, provider text not null, amount numeric(20,2) not null check(amount>0), currency char(3) not null, status text not null default 'pending', created_at timestamptz not null default now());
create table public.ranking_ledger (id uuid primary key default gen_random_uuid(), payment_id uuid not null unique references public.payments(id), business_id uuid not null references public.businesses(id), category_id uuid not null references public.categories(id), country text not null, city text not null, local_currency char(3) not null, local_amount numeric(20,2) not null, usd_amount numeric(20,2) not null, verified_at timestamptz not null, rate_timestamp timestamptz not null, rate_details jsonb not null);
create index on public.ranking_ledger (category_id, verified_at, country, city);
create index on public.businesses (status, country, city);
alter table public.user_roles enable row level security;alter table public.categories enable row level security;alter table public.businesses enable row level security;alter table public.business_categories enable row level security;alter table public.audit_logs enable row level security;alter table public.notifications enable row level security;alter table public.payments enable row level security;alter table public.ranking_ledger enable row level security;
create policy "read own role" on public.user_roles for select to authenticated using (user_id=auth.uid());
create policy "read active categories" on public.categories for select using (active);
create policy "read visible businesses" on public.businesses for select using (status='approved' or owner_id=auth.uid() or exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin'));
create policy "read visible categories" on public.business_categories for select using (exists(select 1 from public.businesses b where b.id=business_id));
create policy "read own notifications" on public.notifications for select to authenticated using (user_id=auth.uid());
create policy "read own payments" on public.payments for select to authenticated using (user_id=auth.uid());
create policy "admin read audit" on public.audit_logs for select to authenticated using (exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin'));
create function public.submit_business(p_name text,p_slug text,p_description text,p_country text,p_city text,p_address text,p_type text,p_contact text,p_email text,p_phone text,p_website text,p_logo text,p_categories text[]) returns uuid language plpgsql security definer set search_path=public as $$
declare bid uuid; found_count int;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(trim(p_name))=0 or length(trim(p_description))=0 or length(trim(p_country))=0 or length(trim(p_city))=0 or length(trim(p_address))=0 or length(trim(p_contact))=0 or length(trim(p_email))=0 or length(trim(p_phone))=0 or p_logo is null or cardinality(p_categories)=0 then raise exception 'Missing required fields'; end if;
 if p_website is not null and p_website !~* '^https?://' then raise exception 'Invalid website'; end if;
 select count(*) into found_count from categories where active and name=any(p_categories);
 if found_count <> cardinality(p_categories) then raise exception 'Invalid or duplicate categories'; end if;
 insert into businesses(owner_id,name,slug,description,country,city,address,business_type,contact_name,email,phone,website,logo_url) values(auth.uid(),p_name,p_slug,p_description,p_country,p_city,p_address,p_type,p_contact,p_email,p_phone,p_website,p_logo) returning id into bid;
 insert into business_categories select bid,id from categories where name=any(p_categories);
 insert into notifications(user_id,message) values(auth.uid(),'Your business was submitted for review.');return bid;
end $$;
revoke all on function public.submit_business(text,text,text,text,text,text,text,text,text,text,text,text,text[]) from public;grant execute on function public.submit_business(text,text,text,text,text,text,text,text,text,text,text,text,text[]) to authenticated;
create function public.review_business(p_id uuid,p_status text,p_note text) returns void language plpgsql security definer set search_path=public as $$
declare owner uuid;begin
 if not exists(select 1 from user_roles where user_id=auth.uid() and role='admin') then raise exception 'Unauthorized'; end if;
 if p_status not in ('approved','rejected','suspended') or length(trim(p_note))=0 then raise exception 'Invalid review'; end if;
 update businesses set status=p_status where id=p_id returning owner_id into owner;if owner is null then raise exception 'Business not found'; end if;
 insert into audit_logs(actor_id,action,subject_id,reason) values(auth.uid(),'business_'||p_status,p_id,p_note);
 insert into notifications(user_id,message) values(owner,'Your business status changed to '||p_status||'.');end $$;
revoke all on function public.review_business(uuid,text,text) from public;grant execute on function public.review_business(uuid,text,text) to authenticated;
-- Only contributions in the immutable ledger are considered. A payment pipeline must be implemented before launch.
create function public.public_leaderboard(p_category text,p_period text,p_scope text,p_country text default null,p_city text default null,p_search text default null) returns table(business_id uuid,name text,slug text,city text,country text,currency text,total numeric) language sql stable security definer set search_path=public as $$
 select b.id,b.name,b.slug,b.city,b.country,case when p_scope='global' then 'USD' else max(l.local_currency)::text end, sum(case when p_scope='global' then l.usd_amount else l.local_amount end) as total
 from ranking_ledger l join businesses b on b.id=l.business_id join categories c on c.id=l.category_id
 where b.status='approved' and c.active and c.name=p_category and p_scope in ('global','country','city') and p_period in ('daily','weekly','monthly','lifetime')
 and (p_scope='global' or (p_country is not null and lower(b.country)=lower(p_country))) and (p_scope<>'city' or (p_city is not null and lower(b.city)=lower(p_city)))
 and (p_search is null or b.name ilike '%'||replace(replace(p_search,'%',''),'_','')||'%')
 and (p_period='lifetime' or l.verified_at >= case p_period when 'daily' then date_trunc('day',now() at time zone 'UTC') at time zone 'UTC' when 'weekly' then date_trunc('week',now() at time zone 'UTC') at time zone 'UTC' else date_trunc('month',now() at time zone 'UTC') at time zone 'UTC' end)
 group by b.id,b.name,b.slug,b.city,b.country order by total desc,max(l.verified_at) asc,b.id limit 100;
$$;
grant execute on function public.public_leaderboard(text,text,text,text,text,text) to anon,authenticated;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('business-logos','business-logos',true,2000000,array['image/png','image/jpeg','image/webp']);
create policy "owner uploads logo" on storage.objects for insert to authenticated with check(bucket_id='business-logos' and (storage.foldername(name))[1]=auth.uid()::text);

insert into public.categories(name) values
('Fashion Designers'),
('Clothing Brands'),
('Shoes and Footwear'),
('Bags and Accessories'),
('Beauty and Cosmetics'),
('Real Estate Agencies'),
('Property Developers'),
('Property Management'),
('Short-let Apartments'),
('Restaurants'),
('Fast Food'),
('Catering Services'),
('Bakeries'),
('Software Companies'),
('Web Development'),
('Mobile App Development'),
('AI Products and Services'),
('Universities and Colleges'),
('Private Schools'),
('Online Learning Platforms'),
('Professional Training'),
('Hospitals and Clinics'),
('Medical Laboratories'),
('Pharmacies'),
('Fitness and Gyms'),
('Logistics Companies'),
('Courier and Delivery'),
('Importation Businesses'),
('Transportation Services'),
('Fintech Companies'),
('Accounting Firms'),
('Business Consultants'),
('Legal Services'),
('Film Production'),
('Photography'),
('Content Creators'),
('Advertising Agencies'),
('Online Stores'),
('Supermarkets'),
('Electronics Stores'),
('Construction Companies'),
('Building Materials'),
('Electrical Services'),
('Cleaning Services');
