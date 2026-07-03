create extension if not exists "pgcrypto";

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  balance numeric not null default 0,
  color text not null default '#163a5f',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key text not null unique,
  income numeric not null default 0,
  expense numeric not null default 0,
  pending numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  status text not null,
  amount numeric not null,
  concept text not null,
  account_id uuid references public.accounts(id) on delete set null,
  category text not null,
  unit text not null,
  due_date timestamptz,
  date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lender text not null,
  balance numeric not null default 0,
  installment numeric not null default 0,
  next_due_date timestamptz not null,
  status text not null,
  priority text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  issuer text not null,
  limit_value numeric not null default 0,
  used numeric not null default 0,
  cut_off_date integer not null,
  pay_due_date integer not null,
  minimum_payment numeric not null default 0,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target numeric not null default 0,
  current numeric not null default 0,
  color text not null default '#16735b',
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;
alter table public.business_units enable row level security;
alter table public.transactions enable row level security;
alter table public.debts enable row level security;
alter table public.credit_cards enable row level security;
alter table public.savings_goals enable row level security;

do $$ begin
  create policy "read accounts" on public.accounts for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read business units" on public.business_units for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read transactions" on public.transactions for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read debts" on public.debts for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read credit cards" on public.credit_cards for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read savings goals" on public.savings_goals for select using (true);
exception when duplicate_object then null; end $$;
