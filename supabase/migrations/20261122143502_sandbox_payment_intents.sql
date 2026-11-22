-- Isolated Flutterwave TEST transactions only. Never used for real rankings.
create table public.sandbox_payment_intents (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 business_id uuid not null references public.businesses(id),
 category_id uuid not null references public.categories(id),
 reference text not null unique default ('outbidly-test-' || gen_random_uuid()::text),
 amount numeric(20,2) not null check (amount >= 500 and amount <= 1000000000),
 currency text not null default 'NGN' check(currency = 'NGN'),
 status text not null default 'pending' check(status in ('pending', 'verified')),
 provider_transaction_id text unique,
 created_at timestamptz not null default now(), verified_at timestamptz,
 check ((status = 'pending' and provider_transaction_id is null and verified_at is null) or
        (status = 'verified' and provider_transaction_id is not null and verified_at is not null))
);
alter table public.sandbox_payment_intents enable row level security;
create policy "read own sandbox intents" on public.sandbox_payment_intents for select to authenticated using(user_id=auth.uid());
revoke all on public.sandbox_payment_intents from public, anon, authenticated;
grant select on public.sandbox_payment_intents to authenticated;
grant select on public.sandbox_payment_intents to service_role;

create function public.create_sandbox_payment_intent(p_business_id uuid, p_category_id uuid, p_amount numeric, p_policy_accepted boolean)
returns table(reference text, amount numeric, currency text) language plpgsql security definer set search_path=public,pg_temp as $$
declare b public.businesses%rowtype; minimum numeric;
begin
 if auth.uid() is null or p_policy_accepted is distinct from true then raise exception 'Authentication and policy acceptance required'; end if;
 select * into b from public.businesses where id=p_business_id for update;
 if not found or b.owner_id <> auth.uid() or b.status <> 'approved' or lower(trim(b.country)) <> 'nigeria' then raise exception 'Business is not eligible'; end if;
 if not exists(select 1 from public.business_categories bc join public.categories c on c.id=bc.category_id where bc.business_id=b.id and bc.category_id=p_category_id and c.active) then raise exception 'Category is not eligible'; end if;
 minimum := case when exists(select 1 from public.sandbox_payment_intents i where i.business_id=b.id and i.category_id=p_category_id and i.status='verified') then 500 else 2000 end;
 if p_amount is null or p_amount = 'NaN'::numeric or p_amount <> round(p_amount,2) or p_amount < minimum or p_amount > 1000000000 then raise exception 'Invalid amount'; end if;
 return query insert into public.sandbox_payment_intents(user_id,business_id,category_id,amount) values(auth.uid(),b.id,p_category_id,p_amount) returning sandbox_payment_intents.reference, sandbox_payment_intents.amount, sandbox_payment_intents.currency;
end $$;
revoke all on function public.create_sandbox_payment_intent(uuid,uuid,numeric,boolean) from public,anon,authenticated;
grant execute on function public.create_sandbox_payment_intent(uuid,uuid,numeric,boolean) to authenticated;

-- Executable only by the server's service role, after direct provider verification.
create function public.confirm_sandbox_payment_intent(p_reference text,p_transaction_id text,p_amount numeric,p_currency text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare i public.sandbox_payment_intents%rowtype;
begin
 if p_transaction_id is null or p_transaction_id !~ '^[1-9][0-9]{0,19}$' then raise exception 'Invalid transaction'; end if;
 select * into i from public.sandbox_payment_intents where reference=p_reference for update;
 if not found or p_amount is null or p_amount <> i.amount or p_currency is distinct from i.currency then raise exception 'Intent mismatch'; end if;
 if i.status='verified' then
   if i.provider_transaction_id <> p_transaction_id then raise exception 'Transaction conflict'; end if;
   return;
 end if;
 update public.sandbox_payment_intents set status='verified',provider_transaction_id=p_transaction_id,verified_at=now() where id=i.id;
end $$;
revoke all on function public.confirm_sandbox_payment_intent(text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.confirm_sandbox_payment_intent(text,text,numeric,text) to service_role;
