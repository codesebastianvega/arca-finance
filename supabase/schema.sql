create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  name text not null,
  currency_code text not null default 'COP',
  timezone text not null default 'America/Bogota',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  monthly_price_cop numeric not null default 0,
  yearly_price_cop numeric,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code) on update cascade,
  status text not null default 'trialing',
  provider text not null default 'manual',
  provider_subscription_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  trial_ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.subscription_plans (code, name, monthly_price_cop, active)
values
  ('free', 'Free', 0, true),
  ('personal_pro', 'Personal Pro', 0, true),
  ('business', 'Business', 0, true)
on conflict (code) do update
set
  name = excluded.name,
  monthly_price_cop = excluded.monthly_price_cop,
  active = excluded.active;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  entity text,
  type text not null,
  balance numeric not null default 0,
  color text not null default '#163a5f',
  archived boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts add column if not exists entity text;

create table if not exists public.business_units (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  key text not null,
  income numeric not null default 0,
  expense numeric not null default 0,
  pending numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.business_units add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.income_sources add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.expense_categories add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.transactions add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.incomes add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.expenses add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.debts add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.debt_payments add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.credit_cards add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.credit_card_purchases add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.credit_card_payments add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.savings_goals add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.savings_transactions add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.monthly_projections add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.financial_events add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

-- Mantener la constraint global legacy `business_units.key` mientras existan
-- foreign keys antiguas que apuntan a ella por `business_unit_key`.
-- La unicidad por workspace queda documentada para una migracion posterior donde
-- esas referencias pasen a `business_unit_id` o a una FK compuesta real.
create unique index if not exists business_units_workspace_key_unique on public.business_units(workspace_id, key);

create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  business_unit_key text not null,
  default_account_id uuid references public.accounts(id) on delete set null,
  type text not null default 'manual',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.income_sources add column if not exists default_account_id uuid references public.accounts(id) on delete set null;

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  group_name text not null default 'general',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists expense_categories_workspace_name_unique
  on public.expense_categories(workspace_id, name);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  kind text not null,
  status text not null,
  amount numeric not null,
  concept text not null,
  account_id uuid references public.accounts(id) on delete set null,
  category text not null,
  unit text not null,
  due_date timestamptz,
  date timestamptz not null default now(),
  posted_at timestamptz,
  source_type text,
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions add column if not exists posted_at timestamptz;
alter table public.transactions add column if not exists source_type text;
alter table public.transactions add column if not exists source_id uuid;
alter table public.transactions add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  source_id uuid references public.income_sources(id) on delete set null,
  business_unit_key text not null,
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
  workspace_id uuid references public.workspaces(id) on delete cascade,
  category_id uuid references public.expense_categories(id) on delete set null,
  business_unit_key text not null,
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
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  lender text not null,
  debt_type text not null default 'personal',
  principal_amount numeric,
  balance numeric not null default 0,
  installment numeric not null default 0,
  next_due_date timestamptz not null,
  annual_interest_rate numeric,
  interest_type text not null default 'unknown',
  term_months integer,
  remaining_months integer,
  paid_installments integer,
  estimated_total_payment numeric,
  status text not null,
  priority text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.debts add column if not exists principal_amount numeric;
alter table public.debts add column if not exists annual_interest_rate numeric;
alter table public.debts add column if not exists interest_type text not null default 'unknown';
alter table public.debts add column if not exists term_months integer;
alter table public.debts add column if not exists paid_installments integer;
alter table public.debts add column if not exists estimated_total_payment numeric;

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
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
  workspace_id uuid references public.workspaces(id) on delete cascade,
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
  brand_color text,
  text_color text,
  archived boolean not null default false,
  notes text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_card_purchases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  business_unit_key text not null,
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
  workspace_id uuid references public.workspaces(id) on delete cascade,
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
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  target numeric not null default 0,
  current numeric not null default 0,
  color text not null default '#16735b',
  goal_type text not null default 'goal',
  archived boolean not null default false,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.savings_goals drop constraint if exists savings_goals_goal_type_check;
alter table public.savings_goals
  add constraint savings_goals_goal_type_check
  check (goal_type in ('goal', 'pocket'));

create table if not exists public.savings_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
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
  workspace_id uuid references public.workspaces(id) on delete cascade,
  month date not null,
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

alter table public.monthly_projections drop constraint if exists monthly_projections_month_key;
drop index if exists monthly_projections_month_key;
create unique index if not exists monthly_projections_workspace_month_unique
  on public.monthly_projections(workspace_id, month);

create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month date not null,
  limit_amount numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists monthly_budgets_workspace_month_unique
  on public.monthly_budgets(workspace_id, month);

create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  debtor_name text not null,
  amount numeric not null default 0,
  due_date date,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists receivables_workspace_status_idx
  on public.receivables(workspace_id, status);
create index if not exists receivables_workspace_due_date_idx
  on public.receivables(workspace_id, due_date);

create table if not exists public.scheduled_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  due_date date not null,
  title text not null,
  amount numeric not null default 0,
  kind text not null,
  status text not null default 'scheduled',
  priority text not null default 'medium',
  business_unit_key text,
  account_id uuid references public.accounts(id) on delete set null,
  suggested_account_id uuid references public.accounts(id) on delete set null,
  linked_entity_type text,
  linked_entity_id uuid,
  paid_amount numeric not null default 0,
  paid_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scheduled_events add column if not exists template_id uuid;
alter table public.scheduled_events add column if not exists timing_status text;
alter table public.scheduled_events add column if not exists confirmed_transaction_id uuid references public.transactions(id) on delete set null;
alter table public.scheduled_events drop constraint if exists scheduled_events_priority_check;
alter table public.scheduled_events
  add constraint scheduled_events_priority_check
  check (priority in ('high', 'medium', 'low'));

create index if not exists scheduled_events_workspace_due_date_idx
  on public.scheduled_events(workspace_id, due_date);
create index if not exists scheduled_events_workspace_status_idx
  on public.scheduled_events(workspace_id, status);
create index if not exists scheduled_events_workspace_template_idx
  on public.scheduled_events(workspace_id, template_id);
create index if not exists scheduled_events_workspace_priority_idx
  on public.scheduled_events(workspace_id, priority);
create index if not exists scheduled_events_workspace_kind_status_idx
  on public.scheduled_events(workspace_id, kind, status);

create table if not exists public.income_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  kind text not null default 'income',
  status text not null default 'active',
  recurrence_mode text not null,
  frequency text not null,
  days_of_month integer[] not null default '{}',
  start_date date not null,
  end_date date,
  occurrence_limit integer,
  default_amount numeric not null default 0,
  default_account_id uuid not null references public.accounts(id) on delete restrict,
  business_unit_key text not null,
  income_source_id uuid not null references public.income_sources(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists income_templates_workspace_status_idx
  on public.income_templates(workspace_id, status);
create index if not exists income_templates_workspace_dates_idx
  on public.income_templates(workspace_id, start_date, end_date);
create index if not exists income_templates_workspace_source_idx
  on public.income_templates(workspace_id, income_source_id);

create table if not exists public.expense_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  kind text not null,
  status text not null default 'active',
  recurrence_mode text not null,
  frequency text not null,
  days_of_month integer[] not null default '{}',
  start_date date not null,
  end_date date,
  occurrence_limit integer,
  default_amount numeric not null default 0,
  default_account_id uuid not null references public.accounts(id) on delete restrict,
  business_unit_key text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expense_templates_workspace_status_idx
  on public.expense_templates(workspace_id, status);
create index if not exists expense_templates_workspace_dates_idx
  on public.expense_templates(workspace_id, start_date, end_date);

create table if not exists public.financial_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  event_date date not null,
  title text not null,
  amount numeric not null default 0,
  event_type text not null,
  status text not null default 'scheduled',
  business_unit_key text,
  account_id uuid references public.accounts(id) on delete set null,
  related_table text,
  related_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create or replace function public.user_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and is_superadmin = true
  );
$$;

create or replace function public.user_has_workspace_access(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.user_is_superadmin()
    or public.user_owns_workspace(target_workspace_id)
    or exists (
      select 1
      from public.workspace_members
      where workspace_id = target_workspace_id
        and user_id = auth.uid()
    );
$$;

create or replace function public.user_owns_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.user_is_superadmin()
    or exists (
      select 1
      from public.workspaces
      where id = target_workspace_id
        and owner_user_id = auth.uid()
    );
$$;

create or replace function public.create_account(
  p_name text,
  p_entity text default null,
  p_type text,
  p_balance numeric default 0,
  p_color text default '#163a5f'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_account_id uuid;
begin
  select workspace_id into v_workspace_id
  from public.workspace_members
  where user_id = auth.uid()
  order by created_at desc
  limit 1;

  if v_workspace_id is null then
    raise exception 'Workspace no disponible para el usuario actual.';
  end if;

  insert into public.accounts (workspace_id, name, entity, type, balance, color, active)
  values (v_workspace_id, p_name, p_entity, p_type, coalesce(p_balance, 0), coalesce(p_color, '#163a5f'), true)
  returning id into v_account_id;

  return jsonb_build_object('account_id', v_account_id, 'workspace_id', v_workspace_id);
end;
$$;

create or replace function public.create_savings_goal(
  p_name text,
  p_target numeric,
  p_current numeric default 0,
  p_due_date timestamptz default null,
  p_color text default '#16735b'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_goal_id uuid;
begin
  select workspace_id into v_workspace_id
  from public.workspace_members
  where user_id = auth.uid()
  order by created_at desc
  limit 1;

  if v_workspace_id is null then
    raise exception 'Workspace no disponible para el usuario actual.';
  end if;

  insert into public.savings_goals (workspace_id, name, target, current, color, due_date)
  values (v_workspace_id, p_name, p_target, coalesce(p_current, 0), coalesce(p_color, '#16735b'), p_due_date)
  returning id into v_goal_id;

  return jsonb_build_object('savings_goal_id', v_goal_id, 'workspace_id', v_workspace_id);
end;
$$;

create or replace function public.create_debt(
  p_name text,
  p_lender text,
  p_debt_type text default 'personal',
  p_principal_amount numeric default null,
  p_balance numeric default 0,
  p_installment numeric default 0,
  p_next_due_date timestamptz default now(),
  p_annual_interest_rate numeric default null,
  p_interest_type text default 'unknown',
  p_term_months integer default null,
  p_remaining_months integer default null,
  p_estimated_total_payment numeric default null,
  p_priority text default 'medium',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_debt_id uuid;
  v_event_id uuid;
begin
  select workspace_id into v_workspace_id
  from public.workspace_members
  where user_id = auth.uid()
  order by created_at desc
  limit 1;

  if v_workspace_id is null then
    raise exception 'Workspace no disponible para el usuario actual.';
  end if;

  insert into public.debts (
    workspace_id, name, lender, debt_type, principal_amount, balance, installment, next_due_date,
    annual_interest_rate, interest_type, term_months, remaining_months, estimated_total_payment,
    status, priority, notes
  )
  values (
    v_workspace_id, p_name, p_lender, coalesce(p_debt_type, 'personal'), p_principal_amount, coalesce(p_balance, 0),
    coalesce(p_installment, 0), p_next_due_date, p_annual_interest_rate, coalesce(p_interest_type, 'unknown'),
    p_term_months, p_remaining_months, p_estimated_total_payment,
    case when coalesce(p_balance, 0) <= 0 then 'paid' else 'active' end, coalesce(p_priority, 'medium'), p_notes
  )
  returning id into v_debt_id;

  if coalesce(p_installment, 0) > 0 then
    insert into public.scheduled_events (
      workspace_id, due_date, title, amount, kind, status, business_unit_key, linked_entity_type, linked_entity_id, notes
    )
    values (
      v_workspace_id, p_next_due_date::date, 'Pago ' || p_name, p_installment, 'debt_payment', 'scheduled', 'personal', 'debt', v_debt_id, p_notes
    )
    returning id into v_event_id;
  end if;

  return jsonb_build_object('debt_id', v_debt_id, 'scheduled_event_id', v_event_id, 'workspace_id', v_workspace_id);
end;
$$;

create or replace function public.create_credit_card(
  p_name text,
  p_issuer text,
  p_limit_value numeric default 0,
  p_used numeric default 0,
  p_cut_off_date integer default 1,
  p_pay_due_date integer default 1,
  p_minimum_payment numeric default 0,
  p_annual_interest_rate numeric default null,
  p_interest_type text default 'unknown',
  p_estimated_payoff_months integer default null,
  p_estimated_total_payment numeric default null,
  p_payment_strategy text default 'minimum',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_card_id uuid;
  v_due_date date;
  v_event_id uuid;
begin
  select workspace_id into v_workspace_id
  from public.workspace_members
  where user_id = auth.uid()
  order by created_at desc
  limit 1;

  if v_workspace_id is null then
    raise exception 'Workspace no disponible para el usuario actual.';
  end if;

  insert into public.credit_cards (
    workspace_id, name, issuer, limit_value, used, cut_off_date, pay_due_date, minimum_payment,
    annual_interest_rate, interest_type, estimated_payoff_months, estimated_total_payment, payment_strategy, notes, status
  )
  values (
    v_workspace_id, p_name, p_issuer, coalesce(p_limit_value, 0), coalesce(p_used, 0), p_cut_off_date, p_pay_due_date,
    coalesce(p_minimum_payment, 0), p_annual_interest_rate, coalesce(p_interest_type, 'unknown'), p_estimated_payoff_months,
    p_estimated_total_payment, coalesce(p_payment_strategy, 'minimum'), p_notes,
    case when coalesce(p_used, 0) >= coalesce(p_limit_value, 0) and coalesce(p_limit_value, 0) > 0 then 'blocked' else 'active' end
  )
  returning id into v_card_id;

  v_due_date := make_date(extract(year from current_date)::int, extract(month from current_date)::int, least(greatest(p_pay_due_date, 1), 28));
  if v_due_date < current_date then
    v_due_date := (v_due_date + interval '1 month')::date;
  end if;

  if coalesce(p_minimum_payment, 0) > 0 then
    insert into public.scheduled_events (
      workspace_id, due_date, title, amount, kind, status, business_unit_key, linked_entity_type, linked_entity_id, notes
    )
    values (
      v_workspace_id, v_due_date, 'Pago minimo ' || p_name, p_minimum_payment, 'card_payment', 'scheduled', 'personal', 'credit_card', v_card_id, p_notes
    )
    returning id into v_event_id;
  end if;

  return jsonb_build_object('credit_card_id', v_card_id, 'scheduled_event_id', v_event_id, 'workspace_id', v_workspace_id);
end;
$$;

create or replace function public.get_free_cash(
  p_workspace_id uuid,
  p_as_of date default current_date
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cash numeric;
  v_protected numeric;
begin
  if not public.user_has_workspace_access(p_workspace_id) then
    raise exception 'No tienes acceso a este workspace.';
  end if;

  select coalesce(sum(balance), 0) into v_cash
  from public.accounts
  where workspace_id = p_workspace_id and active = true;

  select coalesce(sum(current), 0) into v_protected
  from public.savings_goals
  where workspace_id = p_workspace_id;

  return coalesce(v_cash, 0) - coalesce(v_protected, 0);
end;
$$;

create or replace function public.create_movement(
  p_workspace_id uuid,
  p_kind text,
  p_amount numeric,
  p_concept text,
  p_account_id uuid,
  p_category text,
  p_unit text,
  p_effective_date date,
  p_due_date date default null,
  p_status text default 'confirmed',
  p_source_type text default null,
  p_source_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
  v_event_id uuid;
  v_balance numeric;
  v_delta numeric := 0;
  v_posted boolean := p_status in ('confirmed', 'paid');
  v_account_workspace_id uuid;
  v_kind text := p_kind;
begin
  if not public.user_has_workspace_access(p_workspace_id) then
    raise exception 'No tienes acceso a este workspace.';
  end if;

  select workspace_id, balance into v_account_workspace_id, v_balance
  from public.accounts
  where id = p_account_id;

  if v_account_workspace_id is distinct from p_workspace_id then
    raise exception 'La cuenta no pertenece al workspace actual.';
  end if;

  if v_posted then
    if v_kind in ('income', 'saving_withdrawal') then
      v_delta := p_amount;
    elsif v_kind in ('expense', 'debt_payment', 'card_payment', 'saving_contribution') then
      v_delta := -p_amount;
    end if;

    if v_delta < 0 and coalesce(v_balance, 0) < abs(v_delta) then
      raise exception 'Saldo insuficiente para registrar el movimiento.';
    end if;

    insert into public.transactions (
      workspace_id, kind, status, amount, concept, account_id, category, unit, due_date, date, posted_at, source_type, source_id, metadata
    )
    values (
      p_workspace_id, v_kind, p_status, p_amount, p_concept, p_account_id, p_category, p_unit, p_due_date, p_effective_date,
      p_effective_date, p_source_type, p_source_id, coalesce(p_metadata, '{}'::jsonb)
    )
    returning id into v_transaction_id;

    if v_delta <> 0 then
      update public.accounts set balance = balance + v_delta where id = p_account_id;
    end if;
  else
    insert into public.scheduled_events (
      workspace_id, due_date, title, amount, kind, status, business_unit_key, account_id, linked_entity_type, linked_entity_id, notes
    )
    values (
      p_workspace_id, coalesce(p_due_date, p_effective_date), p_concept, p_amount,
      case when p_kind = 'saving_contribution' then 'saving' else p_kind end,
      p_status, p_unit, p_account_id, p_source_type, p_source_id, nullif(coalesce(p_metadata ->> 'notes', ''), '')
    )
    returning id into v_event_id;
  end if;

  return jsonb_build_object('transaction_id', v_transaction_id, 'scheduled_event_id', v_event_id, 'account_id', p_account_id);
end;
$$;

create or replace function public.record_card_purchase(
  p_workspace_id uuid,
  p_credit_card_id uuid,
  p_concept text,
  p_amount numeric,
  p_purchase_date date,
  p_business_unit_key text,
  p_category_id uuid default null,
  p_installments integer default 1,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.credit_cards%rowtype;
  v_transaction_id uuid;
  v_purchase_id uuid;
begin
  if not public.user_has_workspace_access(p_workspace_id) then
    raise exception 'No tienes acceso a este workspace.';
  end if;

  select * into v_card
  from public.credit_cards
  where id = p_credit_card_id and workspace_id = p_workspace_id;

  if v_card.id is null then
    raise exception 'Tarjeta no disponible para el workspace actual.';
  end if;

  if (coalesce(v_card.limit_value, 0) - coalesce(v_card.used, 0)) < p_amount then
    raise exception 'Cupo insuficiente para registrar la compra.';
  end if;

  insert into public.transactions (
    workspace_id, kind, status, amount, concept, account_id, category, unit, date, posted_at, source_type, source_id, metadata
  )
  values (
    p_workspace_id, 'card_purchase', 'confirmed', p_amount, p_concept, null, 'Consumo tarjeta', p_business_unit_key,
    p_purchase_date, p_purchase_date, 'credit_card', p_credit_card_id, jsonb_build_object('notes', p_notes)
  )
  returning id into v_transaction_id;

  insert into public.credit_card_purchases (
    workspace_id, credit_card_id, business_unit_key, category_id, concept, merchant, amount, installments, monthly_installment, purchase_date, status, notes
  )
  values (
    p_workspace_id, p_credit_card_id, p_business_unit_key, p_category_id, p_concept, null, p_amount,
    greatest(coalesce(p_installments, 1), 1), round((p_amount / greatest(coalesce(p_installments, 1), 1))::numeric, 2),
    p_purchase_date, 'active', p_notes
  )
  returning id into v_purchase_id;

  update public.credit_cards set used = used + p_amount where id = p_credit_card_id;

  return jsonb_build_object('transaction_id', v_transaction_id, 'credit_card_purchase_id', v_purchase_id, 'credit_card_id', p_credit_card_id);
end;
$$;

create or replace function public.create_transfer(
  p_workspace_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_concept text,
  p_effective_date date,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_balance numeric;
  v_from_workspace_id uuid;
  v_to_workspace_id uuid;
  v_transfer_id uuid := gen_random_uuid();
begin
  if not public.user_has_workspace_access(p_workspace_id) then
    raise exception 'No tienes acceso a este workspace.';
  end if;

  if p_from_account_id = p_to_account_id then
    raise exception 'La cuenta origen y destino deben ser distintas.';
  end if;

  select workspace_id, balance into v_from_workspace_id, v_from_balance from public.accounts where id = p_from_account_id;
  select workspace_id into v_to_workspace_id from public.accounts where id = p_to_account_id;

  if v_from_workspace_id is distinct from p_workspace_id or v_to_workspace_id is distinct from p_workspace_id then
    raise exception 'Las cuentas deben pertenecer al workspace actual.';
  end if;

  if coalesce(v_from_balance, 0) < p_amount then
    raise exception 'Saldo insuficiente para transferir.';
  end if;

  update public.accounts set balance = balance - p_amount where id = p_from_account_id;
  update public.accounts set balance = balance + p_amount where id = p_to_account_id;

  insert into public.transactions (
    workspace_id, kind, status, amount, concept, account_id, category, unit, date, posted_at, metadata
  )
  values
    (
      p_workspace_id, 'transfer', 'confirmed', p_amount, p_concept || ' - salida', p_from_account_id, 'Transferencia', 'personal',
      p_effective_date, p_effective_date, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('transfer_id', v_transfer_id, 'direction', 'out', 'to_account_id', p_to_account_id)
    ),
    (
      p_workspace_id, 'transfer', 'confirmed', p_amount, p_concept || ' - entrada', p_to_account_id, 'Transferencia', 'personal',
      p_effective_date, p_effective_date, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('transfer_id', v_transfer_id, 'direction', 'in', 'from_account_id', p_from_account_id)
    );

  return jsonb_build_object('transfer_id', v_transfer_id);
end;
$$;

create or replace function public.pay_obligation(
  p_workspace_id uuid,
  p_scheduled_event_id uuid,
  p_funding_account_id uuid default null,
  p_funding_card_id uuid default null,
  p_amount numeric default null,
  p_paid_at date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.scheduled_events%rowtype;
  v_account public.accounts%rowtype;
  v_card public.credit_cards%rowtype;
  v_amount numeric;
  v_tx_kind text;
  v_transaction_id uuid;
begin
  if not public.user_has_workspace_access(p_workspace_id) then
    raise exception 'No tienes acceso a este workspace.';
  end if;

  if p_funding_account_id is null and p_funding_card_id is null then
    raise exception 'Debes indicar una fuente de pago.';
  end if;

  if p_funding_account_id is not null and p_funding_card_id is not null then
    raise exception 'Solo puede existir una fuente de pago por operacion.';
  end if;

  select * into v_event from public.scheduled_events where id = p_scheduled_event_id and workspace_id = p_workspace_id;
  if v_event.id is null then
    raise exception 'La obligacion no existe en el workspace actual.';
  end if;

  v_amount := coalesce(p_amount, v_event.amount);

  if p_funding_account_id is not null then
    select * into v_account from public.accounts where id = p_funding_account_id and workspace_id = p_workspace_id;
    if v_account.id is null then
      raise exception 'Cuenta de pago no valida.';
    end if;
    if coalesce(v_account.balance, 0) < v_amount then
      raise exception 'Saldo insuficiente para pagar la obligacion.';
    end if;

    update public.accounts set balance = balance - v_amount where id = p_funding_account_id;

    v_tx_kind := case
      when v_event.kind = 'debt_payment' then 'debt_payment'
      when v_event.kind = 'card_payment' then 'card_payment'
      when v_event.kind = 'saving' then 'saving_contribution'
      else 'expense'
    end;

    insert into public.transactions (
      workspace_id, kind, status, amount, concept, account_id, category, unit, due_date, date, posted_at, source_type, source_id, metadata
    )
    values (
      p_workspace_id, v_tx_kind, 'paid', v_amount, v_event.title, p_funding_account_id, 'Pago programado',
      coalesce(v_event.business_unit_key, 'personal'), v_event.due_date, coalesce(p_paid_at, current_date), coalesce(p_paid_at, current_date),
      v_event.linked_entity_type, v_event.linked_entity_id, jsonb_build_object('scheduled_event_id', v_event.id)
    )
    returning id into v_transaction_id;
  else
    select * into v_card from public.credit_cards where id = p_funding_card_id and workspace_id = p_workspace_id;
    if v_card.id is null then
      raise exception 'Tarjeta de financiacion no valida.';
    end if;
    if (coalesce(v_card.limit_value, 0) - coalesce(v_card.used, 0)) < v_amount then
      raise exception 'Cupo insuficiente para financiar la obligacion con tarjeta.';
    end if;

    update public.credit_cards set used = used + v_amount where id = p_funding_card_id;

    insert into public.transactions (
      workspace_id, kind, status, amount, concept, account_id, category, unit, due_date, date, posted_at, source_type, source_id, metadata
    )
    values (
      p_workspace_id, 'card_purchase', 'confirmed', v_amount, v_event.title, null, 'Obligacion financiada con tarjeta',
      coalesce(v_event.business_unit_key, 'personal'), v_event.due_date, coalesce(p_paid_at, current_date), coalesce(p_paid_at, current_date),
      'credit_card', p_funding_card_id, jsonb_build_object('scheduled_event_id', v_event.id)
    )
    returning id into v_transaction_id;
  end if;

  update public.scheduled_events
  set status = 'paid',
      account_id = coalesce(p_funding_account_id, account_id),
      linked_entity_type = coalesce(linked_entity_type, case when p_funding_card_id is not null then 'credit_card' else linked_entity_type end),
      linked_entity_id = coalesce(linked_entity_id, p_funding_card_id),
      updated_at = now()
  where id = v_event.id;

  if v_event.linked_entity_type = 'debt' and v_event.linked_entity_id is not null then
    update public.debts
    set balance = greatest(balance - v_amount, 0),
        status = case when greatest(balance - v_amount, 0) = 0 then 'paid' else 'active' end
    where id = v_event.linked_entity_id;
  elsif v_event.linked_entity_type = 'credit_card' and v_event.linked_entity_id is not null and p_funding_account_id is not null then
    update public.credit_cards
    set used = greatest(used - v_amount, 0),
        status = case when greatest(used - v_amount, 0) >= limit_value and limit_value > 0 then 'blocked' else 'active' end
    where id = v_event.linked_entity_id;
  end if;

  return jsonb_build_object('scheduled_event_id', v_event.id, 'transaction_id', v_transaction_id);
end;
$$;

create or replace function public.get_today_summary(
  p_workspace_id uuid,
  p_as_of date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_cash numeric;
  v_protected_savings numeric;
  v_free_cash numeric;
  v_monthly_expected_income numeric;
  v_monthly_commitments numeric;
  v_monthly_posted_expenses numeric;
  v_debt_exposure numeric;
  v_urgent_items jsonb;
  v_next_income jsonb;
begin
  if not public.user_has_workspace_access(p_workspace_id) then
    raise exception 'No tienes acceso a este workspace.';
  end if;

  select coalesce(sum(balance), 0) into v_current_cash from public.accounts where workspace_id = p_workspace_id and active = true;
  select coalesce(sum(current), 0) into v_protected_savings from public.savings_goals where workspace_id = p_workspace_id;
  v_free_cash := coalesce(v_current_cash, 0) - coalesce(v_protected_savings, 0);

  select coalesce(sum(amount), 0) into v_monthly_expected_income
  from public.scheduled_events
  where workspace_id = p_workspace_id and kind = 'income' and status not in ('paid', 'confirmed', 'cancelled')
    and date_trunc('month', due_date::timestamp) = date_trunc('month', p_as_of::timestamp);

  select coalesce(sum(amount), 0) into v_monthly_commitments
  from public.scheduled_events
  where workspace_id = p_workspace_id and kind in ('expense', 'debt_payment', 'card_payment', 'saving') and status not in ('paid', 'confirmed', 'cancelled')
    and date_trunc('month', due_date::timestamp) = date_trunc('month', p_as_of::timestamp);

  select coalesce(sum(amount), 0) into v_monthly_posted_expenses
  from public.transactions
  where workspace_id = p_workspace_id and kind in ('expense', 'debt_payment', 'card_payment', 'saving_contribution') and status <> 'cancelled'
    and date_trunc('month', date::timestamp) = date_trunc('month', p_as_of::timestamp);

  select
    coalesce((select sum(balance) from public.debts where workspace_id = p_workspace_id), 0)
    + coalesce((select sum(used) from public.credit_cards where workspace_id = p_workspace_id), 0)
  into v_debt_exposure;

  with account_ranking as (
    select id, name, balance from public.accounts where workspace_id = p_workspace_id and active = true order by balance desc
  ),
  event_base as (
    select
      se.*,
      case
        when se.status in ('paid', 'confirmed', 'cancelled') then 'later'
        when se.due_date < p_as_of then 'overdue'
        when se.due_date = p_as_of then 'today'
        when se.due_date <= (p_as_of + interval '7 day')::date then 'soon'
        else 'later'
      end as urgency
    from public.scheduled_events se
    where se.workspace_id = p_workspace_id and se.status not in ('paid', 'confirmed', 'cancelled')
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', eb.id,
      'title', eb.title,
      'dueDate', eb.due_date,
      'amount', eb.amount,
      'kind', eb.kind,
      'status', eb.status,
      'urgency', eb.urgency,
      'fundingStatus',
        case
          when eb.kind = 'income' then 'ready'
          when exists(select 1 from account_ranking ar where ar.balance >= eb.amount) then 'ready'
          when (select coalesce(sum(balance), 0) from account_ranking) >= eb.amount then 'combine'
          else 'wait'
        end,
      'fundingAccountName',
        case when eb.kind = 'income' then 'Ingreso esperado' else coalesce((select name from account_ranking limit 1), 'Cuenta por definir') end,
      'fundingBalanceAfter',
        case
          when eb.kind = 'income' then null
          when exists(select 1 from account_ranking ar where ar.balance >= eb.amount)
            then (select ar.balance - eb.amount from account_ranking ar where ar.balance >= eb.amount order by ar.balance desc limit 1)
          when (select coalesce(sum(balance), 0) from account_ranking) >= eb.amount
            then (select coalesce(sum(balance), 0) from account_ranking) - eb.amount
          else null
        end,
      'fundingShortfall',
        case
          when eb.kind = 'income' then null
          when (select coalesce(sum(balance), 0) from account_ranking) < eb.amount
            then eb.amount - (select coalesce(sum(balance), 0) from account_ranking)
          else null
        end
    ) order by eb.due_date asc
  ), '[]'::jsonb)
  into v_urgent_items
  from event_base eb;

  select jsonb_build_object(
    'id', se.id, 'workspaceId', se.workspace_id, 'dueDate', se.due_date, 'title', se.title, 'amount', se.amount,
    'kind', se.kind, 'status', se.status, 'accountId', se.account_id, 'linkedEntityType', se.linked_entity_type,
    'linkedEntityId', se.linked_entity_id, 'unit', se.business_unit_key, 'notes', se.notes
  )
  into v_next_income
  from public.scheduled_events se
  where se.workspace_id = p_workspace_id and se.kind = 'income' and se.status not in ('paid', 'confirmed', 'cancelled')
  order by se.due_date asc
  limit 1;

  return jsonb_build_object(
    'currentCash', coalesce(v_current_cash, 0),
    'protectedSavings', coalesce(v_protected_savings, 0),
    'freeCash', coalesce(v_free_cash, 0),
    'monthlyExpectedIncome', coalesce(v_monthly_expected_income, 0),
    'monthlyCommitments', coalesce(v_monthly_commitments, 0),
    'monthlyPostedExpenses', coalesce(v_monthly_posted_expenses, 0),
    'monthRunway', coalesce(v_free_cash, 0) + coalesce(v_monthly_expected_income, 0) - coalesce(v_monthly_commitments, 0),
    'debtExposure', coalesce(v_debt_exposure, 0),
    'overdueCount', (select count(*) from public.scheduled_events where workspace_id = p_workspace_id and status not in ('paid', 'confirmed', 'cancelled') and due_date < p_as_of),
    'nextIncome', v_next_income,
    'urgentItems', v_urgent_items
  );
end;
$$;

create or replace function public.get_dashboard_summary(
  p_workspace_id uuid,
  p_month date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_cash numeric;
  v_protected_savings numeric;
  v_free_cash numeric;
  v_monthly_income numeric;
  v_monthly_expenses numeric;
  v_monthly_commitments numeric;
  v_debt_exposure numeric;
  v_timeline jsonb;
begin
  if not public.user_has_workspace_access(p_workspace_id) then
    raise exception 'No tienes acceso a este workspace.';
  end if;

  select coalesce(sum(balance), 0) into v_current_cash from public.accounts where workspace_id = p_workspace_id and active = true;
  select coalesce(sum(current), 0) into v_protected_savings from public.savings_goals where workspace_id = p_workspace_id and archived = false;
  v_free_cash := coalesce(v_current_cash, 0) - coalesce(v_protected_savings, 0);

  select coalesce(sum(amount), 0) into v_monthly_income
  from public.transactions
  where workspace_id = p_workspace_id and kind = 'income' and status <> 'cancelled'
    and date_trunc('month', date::timestamp) = date_trunc('month', p_month::timestamp);

  select coalesce(sum(amount), 0) into v_monthly_expenses
  from public.transactions
  where workspace_id = p_workspace_id and kind in ('expense', 'debt_payment', 'card_payment', 'saving_contribution') and status <> 'cancelled'
    and date_trunc('month', date::timestamp) = date_trunc('month', p_month::timestamp);

  select coalesce(sum(amount), 0) into v_monthly_commitments
  from public.scheduled_events
  where workspace_id = p_workspace_id and kind in ('expense', 'debt_payment', 'card_payment', 'saving') and status not in ('paid', 'confirmed', 'cancelled')
    and date_trunc('month', due_date::timestamp) = date_trunc('month', p_month::timestamp);

  select coalesce((select sum(balance) from public.debts where workspace_id = p_workspace_id), 0)
    + coalesce((select sum(used) from public.credit_cards where workspace_id = p_workspace_id), 0)
  into v_debt_exposure;

  with months as (
    select generate_series(date_trunc('month', p_month::timestamp) - interval '5 month', date_trunc('month', p_month::timestamp), interval '1 month')::date as month_date
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'month', to_char(m.month_date, 'YYYY-MM'),
      'income', coalesce((select sum(t.amount) from public.transactions t where t.workspace_id = p_workspace_id and t.kind = 'income' and t.status <> 'cancelled' and date_trunc('month', t.date::timestamp) = date_trunc('month', m.month_date::timestamp)), 0),
      'expenses', coalesce((select sum(t.amount) from public.transactions t where t.workspace_id = p_workspace_id and t.kind in ('expense', 'debt_payment', 'card_payment', 'saving_contribution') and t.status <> 'cancelled' and date_trunc('month', t.date::timestamp) = date_trunc('month', m.month_date::timestamp)), 0),
      'commitments', coalesce((select sum(se.amount) from public.scheduled_events se where se.workspace_id = p_workspace_id and se.kind in ('expense', 'debt_payment', 'card_payment', 'saving') and se.status not in ('paid', 'confirmed', 'cancelled') and date_trunc('month', se.due_date::timestamp) = date_trunc('month', m.month_date::timestamp)), 0),
      'closingBalance', coalesce((select mp.closing_balance from public.monthly_projections mp where mp.workspace_id = p_workspace_id and mp.month = m.month_date limit 1), 0)
    ) order by m.month_date
  ), '[]'::jsonb)
  into v_timeline
  from months m;

  return jsonb_build_object(
    'currentCash', coalesce(v_current_cash, 0),
    'protectedSavings', coalesce(v_protected_savings, 0),
    'freeCash', coalesce(v_free_cash, 0),
    'monthlyIncome', coalesce(v_monthly_income, 0),
    'monthlyExpenses', coalesce(v_monthly_expenses, 0),
    'monthlyCommitments', coalesce(v_monthly_commitments, 0),
    'debtExposure', coalesce(v_debt_exposure, 0),
    'commitmentRatio', case when coalesce(v_current_cash, 0) = 0 then 0 else round((coalesce(v_monthly_commitments, 0) / v_current_cash) * 100, 2) end,
    'overdueCount', (select count(*) from public.scheduled_events where workspace_id = p_workspace_id and status not in ('paid', 'confirmed', 'cancelled') and due_date < current_date),
    'openObligations', (select count(*) from public.scheduled_events where workspace_id = p_workspace_id and status not in ('paid', 'confirmed', 'cancelled') and kind in ('expense', 'debt_payment', 'card_payment', 'saving')),
    'timeline', v_timeline
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.workspace_subscriptions enable row level security;
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
alter table public.monthly_budgets enable row level security;
alter table public.receivables enable row level security;
alter table public.scheduled_events enable row level security;
alter table public.income_templates enable row level security;
alter table public.expense_templates enable row level security;
alter table public.financial_events enable row level security;

alter table public.profiles force row level security;
alter table public.workspaces force row level security;
alter table public.workspace_members force row level security;
alter table public.workspace_subscriptions force row level security;
alter table public.accounts force row level security;
alter table public.business_units force row level security;
alter table public.income_sources force row level security;
alter table public.expense_categories force row level security;
alter table public.transactions force row level security;
alter table public.incomes force row level security;
alter table public.expenses force row level security;
alter table public.debts force row level security;
alter table public.debt_payments force row level security;
alter table public.credit_cards force row level security;
alter table public.credit_card_purchases force row level security;
alter table public.credit_card_payments force row level security;
alter table public.savings_goals force row level security;
alter table public.savings_transactions force row level security;
alter table public.monthly_projections force row level security;
alter table public.monthly_budgets force row level security;
alter table public.receivables force row level security;
alter table public.scheduled_events force row level security;
alter table public.income_templates force row level security;
alter table public.expense_templates force row level security;
alter table public.financial_events force row level security;

drop policy if exists "read accounts" on public.accounts;
drop policy if exists "read business units" on public.business_units;
drop policy if exists "read income sources" on public.income_sources;
drop policy if exists "read expense categories" on public.expense_categories;
drop policy if exists "read transactions" on public.transactions;
drop policy if exists "read incomes" on public.incomes;
drop policy if exists "read expenses" on public.expenses;
drop policy if exists "read debts" on public.debts;
drop policy if exists "read debt payments" on public.debt_payments;
drop policy if exists "read credit cards" on public.credit_cards;
drop policy if exists "read credit card purchases" on public.credit_card_purchases;
drop policy if exists "read credit card payments" on public.credit_card_payments;
drop policy if exists "read savings goals" on public.savings_goals;
drop policy if exists "read savings transactions" on public.savings_transactions;
drop policy if exists "read monthly projections" on public.monthly_projections;
drop policy if exists "read financial events" on public.financial_events;

do $$ begin
  create policy "profiles self read" on public.profiles
    for select using (auth.uid() = id or public.user_is_superadmin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles self update" on public.profiles
    for update using (auth.uid() = id or public.user_is_superadmin())
    with check (auth.uid() = id or public.user_is_superadmin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "workspaces read membership" on public.workspaces
    for select using (public.user_has_workspace_access(id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "workspaces owner insert" on public.workspaces
    for insert with check (owner_user_id = auth.uid() or public.user_is_superadmin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "workspaces owner update" on public.workspaces
    for update using (public.user_owns_workspace(id))
    with check (public.user_owns_workspace(id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "workspace members read" on public.workspace_members
    for select using (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "workspace members owner write" on public.workspace_members
    for all using (public.user_owns_workspace(workspace_id))
    with check (public.user_owns_workspace(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "subscription plans authenticated read" on public.subscription_plans
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "workspace subscriptions read" on public.workspace_subscriptions
    for select using (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "workspace subscriptions owner write" on public.workspace_subscriptions
    for all using (public.user_owns_workspace(workspace_id))
    with check (public.user_owns_workspace(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "accounts workspace access" on public.accounts
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "business units workspace access" on public.business_units
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "income sources workspace access" on public.income_sources
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "expense categories workspace access" on public.expense_categories
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "transactions workspace access" on public.transactions
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "incomes workspace access" on public.incomes
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "expenses workspace access" on public.expenses
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "debts workspace access" on public.debts
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "debt payments workspace access" on public.debt_payments
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "credit cards workspace access" on public.credit_cards
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "credit card purchases workspace access" on public.credit_card_purchases
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "credit card payments workspace access" on public.credit_card_payments
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "savings goals workspace access" on public.savings_goals
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "savings transactions workspace access" on public.savings_transactions
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "monthly projections workspace access" on public.monthly_projections
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "monthly budgets workspace access" on public.monthly_budgets
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "receivables workspace access" on public.receivables
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "scheduled events workspace access" on public.scheduled_events
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "income templates workspace access" on public.income_templates
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "expense templates workspace access" on public.expense_templates
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "financial events workspace access" on public.financial_events
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_workspaces on public.workspaces;
create trigger set_updated_at_workspaces before update on public.workspaces for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_workspace_members on public.workspace_members;
create trigger set_updated_at_workspace_members before update on public.workspace_members for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_subscription_plans on public.subscription_plans;
create trigger set_updated_at_subscription_plans before update on public.subscription_plans for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_workspace_subscriptions on public.workspace_subscriptions;
create trigger set_updated_at_workspace_subscriptions before update on public.workspace_subscriptions for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_accounts on public.accounts;
create trigger set_updated_at_accounts before update on public.accounts for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_business_units on public.business_units;
create trigger set_updated_at_business_units before update on public.business_units for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_transactions on public.transactions;
create trigger set_updated_at_transactions before update on public.transactions for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_incomes on public.incomes;
create trigger set_updated_at_incomes before update on public.incomes for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_expenses on public.expenses;
create trigger set_updated_at_expenses before update on public.expenses for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_debts on public.debts;
create trigger set_updated_at_debts before update on public.debts for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_credit_cards on public.credit_cards;
create trigger set_updated_at_credit_cards before update on public.credit_cards for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_savings_goals on public.savings_goals;
create trigger set_updated_at_savings_goals before update on public.savings_goals for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_monthly_projections on public.monthly_projections;
create trigger set_updated_at_monthly_projections before update on public.monthly_projections for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_monthly_budgets on public.monthly_budgets;
create trigger set_updated_at_monthly_budgets before update on public.monthly_budgets for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_receivables on public.receivables;
create trigger set_updated_at_receivables before update on public.receivables for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_scheduled_events on public.scheduled_events;
create trigger set_updated_at_scheduled_events before update on public.scheduled_events for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_income_templates on public.income_templates;
create trigger set_updated_at_income_templates before update on public.income_templates for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_expense_templates on public.expense_templates;
create trigger set_updated_at_expense_templates before update on public.expense_templates for each row execute function public.set_updated_at();
