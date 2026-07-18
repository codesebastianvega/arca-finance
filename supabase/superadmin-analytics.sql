-- Telemetría interna de producto para el panel SuperAdmin.
-- No almacena prompts ni respuestas de Nova.
create table if not exists public.app_usage_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_key text not null unique,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists app_usage_sessions_workspace_seen_idx
  on public.app_usage_sessions(workspace_id, last_seen_at desc);
create index if not exists app_usage_sessions_user_seen_idx
  on public.app_usage_sessions(user_id, last_seen_at desc);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text,
  provider text not null default 'google',
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  estimated_cost_cop numeric not null default 0,
  latency_ms integer,
  tool_calls integer not null default 0,
  status text not null default 'success',
  finish_reason text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_workspace_created_idx
  on public.ai_usage_events(workspace_id, created_at desc);
create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events(user_id, created_at desc);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  workspace_id uuid references public.workspaces(id) on delete set null,
  action text not null,
  previous_value jsonb not null default '{}'::jsonb,
  next_value jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_workspace_created_idx
  on public.admin_audit_log(workspace_id, created_at desc);

alter table public.app_usage_sessions enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.app_usage_sessions force row level security;
alter table public.ai_usage_events force row level security;
alter table public.admin_audit_log force row level security;

do $$ begin
  create policy "usage sessions superadmin read" on public.app_usage_sessions
    for select using (public.user_is_superadmin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "ai usage superadmin read" on public.ai_usage_events
    for select using (public.user_is_superadmin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admin audit superadmin access" on public.admin_audit_log
    for all using (public.user_is_superadmin())
    with check (public.user_is_superadmin());
exception when duplicate_object then null; end $$;
