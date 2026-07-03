-- Arca data reset
-- Keeps the schema, policies and tables.
-- Removes all operational/demo financial data and recreates only neutral catalogs.

begin;

truncate table
  public.financial_events,
  public.savings_transactions,
  public.savings_goals,
  public.credit_card_payments,
  public.credit_card_purchases,
  public.credit_cards,
  public.debt_payments,
  public.debts,
  public.expenses,
  public.incomes,
  public.transactions,
  public.income_sources,
  public.expense_categories,
  public.accounts,
  public.monthly_projections,
  public.business_units
restart identity cascade;

insert into public.business_units (name, key, income, expense, pending) values
  ('Personal', 'personal', 0, 0, 0),
  ('El Recreo', 'el_recreo', 0, 0, 0),
  ('SIE Travel', 'sie', 0, 0, 0),
  ('Uxio', 'uxio', 0, 0, 0),
  ('Aluna', 'aluna', 0, 0, 0),
  ('Arca', 'arca', 0, 0, 0),
  ('Freelance', 'freelance', 0, 0, 0);

insert into public.expense_categories (name, group_name) values
  ('Alimentacion', 'vida'),
  ('Transporte', 'vida'),
  ('Servicios', 'vida'),
  ('Arriendo', 'vida'),
  ('Salud', 'vida'),
  ('Educacion', 'vida'),
  ('Deuda personal', 'deuda'),
  ('Tarjeta de credito', 'deuda'),
  ('Software', 'operacion'),
  ('Marketing', 'operacion'),
  ('Impuestos', 'operacion'),
  ('Ahorro', 'patrimonio'),
  ('General', 'general');

insert into public.income_sources (name, business_unit_key, type) values
  ('Ingreso personal', 'personal', 'manual'),
  ('Nomina El Recreo', 'el_recreo', 'payroll'),
  ('SIE Travel', 'sie', 'manual'),
  ('Uxio', 'uxio', 'manual'),
  ('Aluna', 'aluna', 'manual'),
  ('Arca', 'arca', 'manual'),
  ('Freelance', 'freelance', 'manual');

commit;
