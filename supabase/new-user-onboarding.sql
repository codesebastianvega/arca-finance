begin;

alter table public.workspaces
  add column if not exists onboarding_completed boolean not null default false;

update public.workspaces as workspace
set onboarding_completed = true
where workspace.onboarding_completed = false
  and exists (
    select 1
    from public.accounts as account
    where account.workspace_id = workspace.id
  );

commit;
