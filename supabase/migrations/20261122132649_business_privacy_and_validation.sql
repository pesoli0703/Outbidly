-- Public profiles expose only deliberately public business information.
-- Owner IDs and the primary contact name remain available to owners and admins only.
drop policy "read visible businesses" on public.businesses;
create policy "owners and admins read businesses" on public.businesses for select to authenticated
using (owner_id = auth.uid() or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create view public.public_businesses as
select id, name, slug, description, country, city, address, business_type, email, phone, website, logo_url, created_at
from public.businesses where status = 'approved';
revoke all on public.public_businesses from public, anon, authenticated;
grant select on public.public_businesses to anon, authenticated;

-- Category visibility must not depend on access to the private business table.
drop policy "read visible categories" on public.business_categories;
create policy "read visible categories" on public.business_categories for select
using (exists (select 1 from public.public_businesses b where b.id = business_id)
    or exists (select 1 from public.businesses b where b.id = business_id));

-- The UI cannot be the security boundary for a directly callable RPC.
create or replace function public.submit_business(p_name text,p_slug text,p_description text,p_country text,p_city text,p_address text,p_type text,p_contact text,p_email text,p_phone text,p_website text,p_logo text,p_categories text[])
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare bid uuid; found_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_name is null or char_length(trim(p_name)) not between 2 and 120
    or p_slug is null or char_length(p_slug) not between 3 and 160 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_description is null or char_length(trim(p_description)) not between 1 and 5000
    or p_country is null or char_length(trim(p_country)) not between 1 and 100
    or p_city is null or char_length(trim(p_city)) not between 1 and 100
    or p_address is null or char_length(trim(p_address)) not between 1 and 300
    or p_type is null or p_type not in ('Registered company','Sole proprietor','Freelancer','Individual professional','Other')
    or p_contact is null or char_length(trim(p_contact)) not between 1 and 120
    or p_email is null or char_length(p_email) > 254 or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_phone is null or p_phone !~ '^\+[1-9][0-9]{6,14}$'
    or (p_website is not null and (char_length(p_website) > 2048 or p_website !~* '^https?://[^[:space:]/]+'))
    or p_categories is null or cardinality(p_categories) not between 1 and 100
    or array_position(p_categories, null) is not null
 then raise exception 'Invalid business details'; end if;
 -- Store an object path, never an arbitrary caller-supplied external URL.
 if p_logo is null or p_logo !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}$')
    or not exists (select 1 from storage.objects o where o.bucket_id = 'business-logos' and o.name = p_logo and o.owner_id = auth.uid()::text)
 then raise exception 'Invalid logo'; end if;
 select count(*) into found_count from public.categories where active and name = any(p_categories);
 if found_count <> cardinality(p_categories) then raise exception 'Invalid or duplicate categories'; end if;
 insert into public.businesses(owner_id,name,slug,description,country,city,address,business_type,contact_name,email,phone,website,logo_url)
 values(auth.uid(),trim(p_name),p_slug,trim(p_description),trim(p_country),trim(p_city),trim(p_address),p_type,trim(p_contact),trim(p_email),p_phone,p_website,p_logo) returning id into bid;
 insert into public.business_categories select bid,id from public.categories where name = any(p_categories);
 insert into public.notifications(user_id,message) values(auth.uid(),'Your business was submitted for review.');
 return bid;
end $$;
revoke execute on function public.submit_business(text,text,text,text,text,text,text,text,text,text,text,text,text[]) from public, anon;
grant execute on function public.submit_business(text,text,text,text,text,text,text,text,text,text,text,text,text[]) to authenticated;

create or replace function public.review_business(p_id uuid,p_status text,p_note text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid;
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin') then raise exception 'Unauthorized'; end if;
 if p_status is null or p_status not in ('approved','rejected','suspended') or p_note is null or char_length(trim(p_note)) not between 1 and 2000 then raise exception 'Invalid review'; end if;
 update public.businesses set status=p_status where id=p_id returning owner_id into owner;
 if owner is null then raise exception 'Business not found'; end if;
 insert into public.audit_logs(actor_id,action,subject_id,reason) values(auth.uid(),'business_'||p_status,p_id,trim(p_note));
 insert into public.notifications(user_id,message) values(owner,'Your business status changed to '||p_status||'.');
end $$;
revoke execute on function public.review_business(uuid,text,text) from public, anon;
grant execute on function public.review_business(uuid,text,text) to authenticated;

-- The earlier category migration already grants administrators access to inactive categories.
