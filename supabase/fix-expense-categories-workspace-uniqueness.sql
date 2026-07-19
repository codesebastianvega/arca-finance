begin;

-- Categories belong to a workspace. Their names must only be unique inside
-- that workspace, not across every Arca customer.
alter table public.expense_categories
  drop constraint if exists expense_categories_name_key;

drop index if exists public.expense_categories_name_key;

create unique index if not exists expense_categories_workspace_name_unique
  on public.expense_categories(workspace_id, name);

commit;
