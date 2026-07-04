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

create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_unit_key text not null references public.business_units(key) on update cascade,
  type text not null default 'manual',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  group_name text not null default 'general',
  active boolean not null default true,
  created_at timestamptz not null default now()
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
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.income_sources(id) on delete set null,
  business_unit_key text not null references public.business_units(key) on update cascade,
  account_id uuid references public.accounts(id) on delete set null,
  concept text not null,
  amount numeric not null,
  expected_date date not null,
  received_date date,
  status text not null default 'expected',
  notes text,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.expense_categories(id) on delete set null,
  business_unit_key text not null references public.business_units(key) on update cascade,
  account_id uuid references public.accounts(id) on delete set null,
  concept text not null,
  amount numeric not null,
  due_date date not null,
  paid_date date,
  status text not null default 'scheduled',
  recurring boolean not null default false,
  recurrence text,
  notes text,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lender text not null,
  debt_type text not null default 'personal',
  balance numeric not null default 0,
  installment numeric not null default 0,
  next_due_date timestamptz not null,
  remaining_months integer,
  status text not null,
  priority text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.debts add column if not exists debt_type text not null default 'personal';
alter table public.debts add column if not exists principal_amount numeric;
alter table public.debts add column if not exists annual_interest_rate numeric;
alter table public.debts add column if not exists interest_type text not null default 'unknown';
alter table public.debts add column if not exists term_months integer;
alter table public.debts add column if not exists remaining_months integer;
alter table public.debts add column if not exists estimated_total_payment numeric;
alter table public.debts add column if not exists notes text;

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  amount numeric not null,
  due_date date not null,
  paid_date date,
  status text not null default 'scheduled',
  notes text,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now()
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
  annual_interest_rate numeric,
  interest_type text not null default 'unknown',
  estimated_payoff_months integer,
  estimated_total_payment numeric,
  payment_strategy text not null default 'minimum',
  notes text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.credit_cards add column if not exists annual_interest_rate numeric;
alter table public.credit_cards add column if not exists interest_type text not null default 'unknown';
alter table public.credit_cards add column if not exists estimated_payoff_months integer;
alter table public.credit_cards add column if not exists estimated_total_payment numeric;
alter table public.credit_cards add column if not exists payment_strategy text not null default 'minimum';
alter table public.credit_cards add column if not exists notes text;

create table if not exists public.credit_card_purchases (
  id uuid primary key default gen_random_uuid(),
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  business_unit_key text not null references public.business_units(key) on update cascade,
  category_id uuid references public.expense_categories(id) on delete set null,
  concept text not null,
  merchant text,
  amount numeric not null,
  installments integer not null default 1,
  monthly_installment numeric not null,
  purchase_date date not null,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_card_payments (
  id uuid primary key default gen_random_uuid(),
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  amount numeric not null,
  due_date date not null,
  paid_date date,
  status text not null default 'scheduled',
  notes text,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now()
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

create table if not exists public.savings_transactions (
  id uuid primary key default gen_random_uuid(),
  savings_goal_id uuid not null references public.savings_goals(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  type text not null,
  amount numeric not null,
  date date not null,
  notes text,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.monthly_projections (
  id uuid primary key default gen_random_uuid(),
  month date not null unique,
  opening_balance numeric not null default 0,
  expected_income numeric not null default 0,
  expected_expenses numeric not null default 0,
  debt_payments numeric not null default 0,
  card_payments numeric not null default 0,
  planned_savings numeric not null default 0,
  closing_balance numeric not null default 0,
  scenario text not null default 'base',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  title text not null,
  amount numeric not null default 0,
  event_type text not null,
  status text not null default 'scheduled',
  business_unit_key text references public.business_units(key) on update cascade,
  account_id uuid references public.accounts(id) on delete set null,
  related_table text,
  related_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;
alter table public.business_units enable row level security;
alter table public.income_sources enable row level security;
alter table public.expense_categories enable row level security;
alter table public.transactions enable row level security;
alter table public.incomes enable row level security;
alter table public.expenses enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.credit_cards enable row level security;
alter table public.credit_card_purchases enable row level security;
alter table public.credit_card_payments enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_transactions enable row level security;
alter table public.monthly_projections enable row level security;
alter table public.financial_events enable row level security;

do $$ begin create policy "read accounts" on public.accounts for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read business units" on public.business_units for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read income sources" on public.income_sources for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read expense categories" on public.expense_categories for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read transactions" on public.transactions for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read incomes" on public.incomes for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read expenses" on public.expenses for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read debts" on public.debts for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read debt payments" on public.debt_payments for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read credit cards" on public.credit_cards for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read credit card purchases" on public.credit_card_purchases for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read credit card payments" on public.credit_card_payments for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read savings goals" on public.savings_goals for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read savings transactions" on public.savings_transactions for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read monthly projections" on public.monthly_projections for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "read financial events" on public.financial_events for select using (true); exception when duplicate_object then null; end $$;
