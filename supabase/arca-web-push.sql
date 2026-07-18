create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  user_agent text,
  timezone text not null default 'America/Bogota',
  active boolean not null default true,
  failure_count integer not null default 0,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_workspace_active_idx on public.push_subscriptions(workspace_id, active);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

create table if not exists public.push_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_key text not null,
  status text not null check (status in ('sent', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(subscription_id, event_key)
);

create index if not exists push_deliveries_workspace_created_idx on public.push_notification_deliveries(workspace_id, created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.push_notification_deliveries enable row level security;

comment on table public.push_subscriptions is 'Dispositivos autorizados por cada usuario para recibir Web Push de Arca.';
comment on table public.push_notification_deliveries is 'Registro y deduplicación de recordatorios enviados por el cron.';
