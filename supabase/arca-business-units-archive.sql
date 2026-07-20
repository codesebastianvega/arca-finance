alter table public.business_units
  add column if not exists archived boolean not null default false;

create index if not exists business_units_workspace_archived_idx
  on public.business_units(workspace_id, archived, created_at);
