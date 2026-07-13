import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(supabaseUrl, supabaseKey);

async function main() {
  const sql = `
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
    select jsonb_agg(
      jsonb_build_object(
        'month', to_char(month_date, 'YYYY-MM'),
        'income', coalesce(m.income, 0),
        'expenses', coalesce(m.expenses, 0)
      ) order by month_date asc
    ) into v_timeline
    from months
    left join (
      select 
        date_trunc('month', date::timestamp)::date as month_date,
        sum(case when kind = 'income' then amount else 0 end) as income,
        sum(case when kind in ('expense', 'debt_payment', 'card_payment', 'saving_contribution') then amount else 0 end) as expenses
      from public.transactions
      where workspace_id = p_workspace_id and status <> 'cancelled'
      group by date_trunc('month', date::timestamp)::date
    ) m using (month_date);

    return jsonb_build_object(
      'freeCash', v_free_cash,
      'protectedSavings', v_protected_savings,
      'monthlyIncome', v_monthly_income,
      'monthlyExpenses', v_monthly_expenses,
      'monthlyCommitments', v_monthly_commitments,
      'debtExposure', v_debt_exposure,
      'timeline', coalesce(v_timeline, '[]'::jsonb)
    );
  end;
  $$;
  `;
  
  // Actually, SupabaseJS cannot run raw SQL via the javascript client natively if we don't have an RPC for it.
  // But wait, there is no generic RPC for executing SQL. 
  // If the user is running a local Postgres instance, we can run it with psql. But they use Supabase remote.
  // The easiest way is to use Supabase CLI if it's installed. 
  console.log("SQL to run:", sql);
}
main();
