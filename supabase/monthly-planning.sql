begin;

create table if not exists public.monthly_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month date not null,
  planned_income numeric not null default 0 check (planned_income >= 0),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, month)
);

create table if not exists public.monthly_plan_allocations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_id uuid not null references public.monthly_plans(id) on delete cascade,
  name text not null,
  allocation_type text not null check (allocation_type in ('expense', 'saving', 'debt', 'free')),
  percentage numeric not null default 0 check (percentage >= 0 and percentage <= 100),
  tracking_category text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, name)
);

alter table public.monthly_plans enable row level security;
alter table public.monthly_plan_allocations enable row level security;
alter table public.monthly_plans force row level security;
alter table public.monthly_plan_allocations force row level security;

do $$ begin
  create policy "monthly plans workspace access" on public.monthly_plans
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "monthly plan allocations workspace access" on public.monthly_plan_allocations
    for all using (public.user_has_workspace_access(workspace_id))
    with check (public.user_has_workspace_access(workspace_id));
exception when duplicate_object then null; end $$;

drop trigger if exists set_updated_at_monthly_plans on public.monthly_plans;
create trigger set_updated_at_monthly_plans before update on public.monthly_plans for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_monthly_plan_allocations on public.monthly_plan_allocations;
create trigger set_updated_at_monthly_plan_allocations before update on public.monthly_plan_allocations for each row execute function public.set_updated_at();

commit;
