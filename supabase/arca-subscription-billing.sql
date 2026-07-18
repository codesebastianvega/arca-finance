-- Ciclo manual de facturación de Arca. Seguro para ejecutar varias veces.
create table if not exists public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subscription_id uuid references public.workspace_subscriptions(id) on delete set null,
  plan_code text not null references public.subscription_plans(code) on update cascade,
  amount_cop numeric not null check (amount_cop >= 0),
  period_start date not null,
  period_end date not null,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'void')),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.subscription_invoices(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  amount_cop numeric not null check (amount_cop >= 0),
  method text not null default 'nu_key',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  reference text,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.subscription_invoices(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('three_days_before', 'due_today', 'one_day_overdue', 'grace_ending')),
  channel text not null default 'in_app',
  scheduled_for timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'shown', 'sent', 'canceled')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (invoice_id, reminder_type, channel)
);

create index if not exists subscription_invoices_workspace_status_idx on public.subscription_invoices (workspace_id, status, due_at);
create index if not exists subscription_payments_workspace_status_idx on public.subscription_payments (workspace_id, status, created_at);
create index if not exists subscription_reminders_schedule_idx on public.subscription_reminders (status, scheduled_for);

alter table public.subscription_invoices enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.subscription_reminders enable row level security;
alter table public.subscription_invoices force row level security;
alter table public.subscription_payments force row level security;
alter table public.subscription_reminders force row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscription_invoices' and policyname = 'subscription invoices workspace read') then
    create policy "subscription invoices workspace read" on public.subscription_invoices for select using (public.user_has_workspace_access(workspace_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscription_payments' and policyname = 'subscription payments workspace read') then
    create policy "subscription payments workspace read" on public.subscription_payments for select using (public.user_has_workspace_access(workspace_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscription_reminders' and policyname = 'subscription reminders workspace read') then
    create policy "subscription reminders workspace read" on public.subscription_reminders for select using (public.user_has_workspace_access(workspace_id));
  end if;
end $$;

drop trigger if exists set_updated_at_subscription_invoices on public.subscription_invoices;
create trigger set_updated_at_subscription_invoices before update on public.subscription_invoices for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_subscription_payments on public.subscription_payments;
create trigger set_updated_at_subscription_payments before update on public.subscription_payments for each row execute function public.set_updated_at();
