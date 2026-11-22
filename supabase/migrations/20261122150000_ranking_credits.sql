-- Ranking credits from verified payments
create table public.ranking_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  payment_intent_id uuid not null references public.sandbox_payment_intents(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'NGN',
  awarded_at timestamptz not null default now(),
  unique(payment_intent_id)
);
alter table public.ranking_credits enable row level security;
create policy "View ranking credits" on public.ranking_credits for select using (true);
revoke insert on public.ranking_credits from public, anon, authenticated;
grant select on public.ranking_credits to public, anon, authenticated;
grant insert on public.ranking_credits to service_role;
