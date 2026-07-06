-- Ajusta estos valores antes de ejecutar.
-- 1. Reemplaza owner_user_email por el correo real del usuario dueño.
-- 2. Cambia workspace_name si no quieres "Arca principal".
-- 3. Ejecuta despues de aplicar schema.sql.

do $$
declare
  owner_user_id uuid;
  owner_email text := 'reemplazar@correo.com';
  workspace_name text := 'Arca principal';
  workspace_slug text;
  target_workspace_id uuid;
begin
  select id into owner_user_id
  from auth.users
  where email = owner_email
  limit 1;

  if owner_user_id is null then
    raise exception 'No existe usuario auth.users con email %', owner_email;
  end if;

  workspace_slug := lower(regexp_replace(workspace_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(owner_user_id::text, 8);

  insert into public.profiles (id, email, full_name)
  values (owner_user_id, owner_email, null)
  on conflict (id) do update set email = excluded.email;

  insert into public.workspaces (owner_user_id, slug, name, currency_code, timezone, status)
  values (owner_user_id, workspace_slug, workspace_name, 'COP', 'America/Bogota', 'active')
  on conflict (slug) do update set name = excluded.name
  returning id into target_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (target_workspace_id, owner_user_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  insert into public.workspace_subscriptions (workspace_id, plan_code, status, provider, trial_ends_at)
  values (target_workspace_id, 'personal_pro', 'trialing', 'manual', now() + interval '14 days')
  on conflict do nothing;

  update public.accounts set workspace_id = target_workspace_id where workspace_id is null;
  update public.business_units set workspace_id = target_workspace_id where workspace_id is null;
  update public.income_sources set workspace_id = target_workspace_id where workspace_id is null;
  update public.expense_categories set workspace_id = target_workspace_id where workspace_id is null;
  update public.transactions set workspace_id = target_workspace_id where workspace_id is null;
  update public.incomes set workspace_id = target_workspace_id where workspace_id is null;
  update public.expenses set workspace_id = target_workspace_id where workspace_id is null;
  update public.debts set workspace_id = target_workspace_id where workspace_id is null;
  update public.debt_payments set workspace_id = target_workspace_id where workspace_id is null;
  update public.credit_cards set workspace_id = target_workspace_id where workspace_id is null;
  update public.credit_card_purchases set workspace_id = target_workspace_id where workspace_id is null;
  update public.credit_card_payments set workspace_id = target_workspace_id where workspace_id is null;
  update public.savings_goals set workspace_id = target_workspace_id where workspace_id is null;
  update public.savings_transactions set workspace_id = target_workspace_id where workspace_id is null;
  update public.monthly_projections set workspace_id = target_workspace_id where workspace_id is null;
  update public.financial_events set workspace_id = target_workspace_id where workspace_id is null;

  insert into public.scheduled_events (
    workspace_id,
    due_date,
    title,
    amount,
    kind,
    status,
    business_unit_key,
    account_id,
    linked_entity_type,
    linked_entity_id,
    notes
  )
  select
    fe.workspace_id,
    fe.event_date,
    fe.title,
    fe.amount,
    fe.event_type,
    fe.status,
    fe.business_unit_key,
    fe.account_id,
    fe.related_table,
    fe.related_id,
    fe.notes
  from public.financial_events fe
  where fe.workspace_id = target_workspace_id
    and not exists (
      select 1
      from public.scheduled_events se
      where se.linked_entity_type = fe.related_table
        and se.linked_entity_id = fe.related_id
        and se.title = fe.title
    );
end $$;
