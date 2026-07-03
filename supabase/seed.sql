begin;

delete from public.financial_events;
delete from public.monthly_projections;
delete from public.savings_transactions;
delete from public.credit_card_payments;
delete from public.credit_card_purchases;
delete from public.debt_payments;
delete from public.expenses;
delete from public.incomes;
delete from public.transactions;
delete from public.savings_goals;
delete from public.credit_cards;
delete from public.debts;
delete from public.expense_categories;
delete from public.income_sources;
delete from public.business_units;
delete from public.accounts;

insert into public.accounts (id, name, type, balance, color, active) values
  ('10000000-0000-4000-8000-000000000001', 'Efectivo', 'cash', 100000, '#16735b', true),
  ('10000000-0000-4000-8000-000000000002', 'Nequi', 'wallet', 200000, '#163a5f', true),
  ('10000000-0000-4000-8000-000000000003', 'Daviplata', 'wallet', 0, '#8f6d3b', true),
  ('10000000-0000-4000-8000-000000000004', 'Nu', 'bank', 0, '#a43d31', true),
  ('10000000-0000-4000-8000-000000000005', 'Cuenta banco principal', 'bank', 0, '#2f4f4f', true);

insert into public.business_units (id, name, key, income, expense, pending) values
  ('20000000-0000-4000-8000-000000000001', 'Empresa', 'empresa', 2000000, 0, 0),
  ('20000000-0000-4000-8000-000000000002', 'Deuxio', 'deuxio', 2300000, 0, 900000),
  ('20000000-0000-4000-8000-000000000003', 'Sie Travel', 'sie', 300000, 0, 300000),
  ('20000000-0000-4000-8000-000000000004', 'Aluna', 'aluna', 0, 0, 0),
  ('20000000-0000-4000-8000-000000000005', 'Personal / hogar', 'personal', 0, 3827300, 3827300);

insert into public.income_sources (id, name, business_unit_key, type) values
  ('21000000-0000-4000-8000-000000000001', 'Salario empresa', 'empresa', 'salary'),
  ('21000000-0000-4000-8000-000000000002', 'Branding de arranque', 'deuxio', 'project'),
  ('21000000-0000-4000-8000-000000000003', 'Fee mensual redes', 'deuxio', 'retainer'),
  ('21000000-0000-4000-8000-000000000004', 'Domingos Sie Travel netos', 'sie', 'operational_net'),
  ('21000000-0000-4000-8000-000000000005', 'Aluna', 'aluna', 'future');

insert into public.expense_categories (id, name, group_name) values
  ('22000000-0000-4000-8000-000000000001', 'Arriendo', 'vivienda'),
  ('22000000-0000-4000-8000-000000000002', 'Gas / credito calentador', 'vivienda'),
  ('22000000-0000-4000-8000-000000000003', 'Servicios', 'hogar'),
  ('22000000-0000-4000-8000-000000000004', 'Deuda personal', 'deudas'),
  ('22000000-0000-4000-8000-000000000005', 'Tarjeta de credito', 'deudas'),
  ('22000000-0000-4000-8000-000000000006', 'Credito', 'deudas'),
  ('22000000-0000-4000-8000-000000000007', 'Celular', 'servicios'),
  ('22000000-0000-4000-8000-000000000008', 'Claro hogar', 'servicios'),
  ('22000000-0000-4000-8000-000000000009', 'Agua', 'servicios');

insert into public.credit_cards (id, name, issuer, limit_value, used, cut_off_date, pay_due_date, minimum_payment, status) values
  ('30000000-0000-4000-8000-000000000001', 'Falabella', 'Banco Falabella', 0, 918000, 20, 5, 153000, 'active'),
  ('30000000-0000-4000-8000-000000000002', 'Rappi Card', 'RappiCard', 0, 1913100, 25, 10, 273300, 'active');

insert into public.debts (id, name, lender, debt_type, balance, installment, next_due_date, remaining_months, status, priority, notes) values
  ('40000000-0000-4000-8000-000000000001', 'Obligacion extraordinaria antes del 5 de julio', 'Pendiente extraordinario', 'one_time', 740000, 740000, '2026-07-04', 1, 'active', 'high', 'Debe morir en julio.'),
  ('40000000-0000-4000-8000-000000000002', 'Deuda amigo', 'Amigo', 'informal', 600000, 600000, '2026-07-15', 1, 'active', 'high', 'Deuda personal informal estimada para julio.'),
  ('40000000-0000-4000-8000-000000000003', 'Codensa / obligacion mensual', 'Codensa', 'monthly_credit', 2460000, 410000, '2026-07-20', 6, 'active', 'high', 'Obligacion mensual recurrente.'),
  ('40000000-0000-4000-8000-000000000004', 'Nequi credito', 'Nequi', 'monthly_credit', 2480000, 124000, '2026-07-20', 20, 'active', 'medium', 'Obligacion de largo plazo.'),
  ('40000000-0000-4000-8000-000000000005', 'Solventa', 'Solventa', 'one_time_late', 607000, 607000, '2026-07-15', 1, 'late', 'high', 'Venia en mora desde el 30 de junio y debe liquidarse en julio.'),
  ('40000000-0000-4000-8000-000000000006', 'Claro hogar deuda anterior', 'Claro', 'past_due_service', 170000, 170000, '2026-07-20', 1, 'active', 'medium', 'No es mensualidad futura; es deuda anterior acumulada.'),
  ('40000000-0000-4000-8000-000000000007', 'Plan celular atrasado', 'Operador celular', 'past_due_service', 129000, 129000, '2026-07-20', 1, 'active', 'medium', 'Tres meses atrasados de aprox 43.000.');

insert into public.savings_goals (id, name, target, current, color) values
  ('50000000-0000-4000-8000-000000000001', 'Ahorro general', 1000000, 0, '#16735b'),
  ('50000000-0000-4000-8000-000000000002', 'FITUR', 2500000, 0, '#8f6d3b'),
  ('50000000-0000-4000-8000-000000000003', 'Emergencia', 5000000, 0, '#163a5f');

insert into public.transactions (id, kind, status, amount, concept, account_id, category, unit, due_date, date, metadata) values
  ('60000000-0000-4000-8000-000000000001', 'income', 'confirmed', 900000, 'Branding arranque 50%', '10000000-0000-4000-8000-000000000002', 'Branding', 'deuxio', null, '2026-07-02', '{"seed":"julio-2026"}'),
  ('60000000-0000-4000-8000-000000000002', 'expense', 'scheduled', 100000, 'Gas / credito calentador', '10000000-0000-4000-8000-000000000002', 'Gas / credito calentador', 'personal', '2026-07-03', '2026-07-03', '{"recurring":"monthly"}'),
  ('60000000-0000-4000-8000-000000000003', 'debt_payment', 'scheduled', 740000, 'Obligacion extraordinaria antes del 5 de julio', '10000000-0000-4000-8000-000000000002', 'Deuda personal', 'personal', '2026-07-04', '2026-07-04', '{}'),
  ('60000000-0000-4000-8000-000000000004', 'card_payment', 'scheduled', 153000, 'Pago Falabella julio', '10000000-0000-4000-8000-000000000002', 'Tarjeta de credito', 'personal', '2026-07-05', '2026-07-05', '{"card":"Falabella"}'),
  ('60000000-0000-4000-8000-000000000005', 'income', 'pending', 900000, 'Branding saldo final', '10000000-0000-4000-8000-000000000002', 'Branding', 'deuxio', '2026-07-09', '2026-07-09', '{}'),
  ('60000000-0000-4000-8000-000000000006', 'card_payment', 'scheduled', 273300, 'Pago Rappi Card julio', '10000000-0000-4000-8000-000000000002', 'Tarjeta de credito', 'personal', '2026-07-10', '2026-07-10', '{"card":"Rappi Card"}'),
  ('60000000-0000-4000-8000-000000000007', 'income', 'pending', 100000, 'Sie Travel domingo 12 julio', '10000000-0000-4000-8000-000000000002', 'Experiencia neta', 'sie', '2026-07-12', '2026-07-12', '{}'),
  ('60000000-0000-4000-8000-000000000008', 'income', 'scheduled', 1000000, 'Quincena empresa 15 julio', '10000000-0000-4000-8000-000000000005', 'Salario', 'empresa', '2026-07-15', '2026-07-15', '{}'),
  ('60000000-0000-4000-8000-000000000009', 'debt_payment', 'scheduled', 600000, 'Pago deuda amigo', '10000000-0000-4000-8000-000000000002', 'Deuda personal', 'personal', '2026-07-15', '2026-07-15', '{}'),
  ('60000000-0000-4000-8000-000000000010', 'debt_payment', 'scheduled', 607000, 'Pago Solventa', '10000000-0000-4000-8000-000000000002', 'Deuda personal', 'personal', '2026-07-15', '2026-07-15', '{"late_since":"2026-06-30"}'),
  ('60000000-0000-4000-8000-000000000011', 'income', 'pending', 100000, 'Sie Travel domingo 19 julio', '10000000-0000-4000-8000-000000000002', 'Experiencia neta', 'sie', '2026-07-19', '2026-07-19', '{}'),
  ('60000000-0000-4000-8000-000000000012', 'debt_payment', 'scheduled', 410000, 'Codensa julio', '10000000-0000-4000-8000-000000000002', 'Credito', 'personal', '2026-07-20', '2026-07-20', '{}'),
  ('60000000-0000-4000-8000-000000000013', 'debt_payment', 'scheduled', 124000, 'Nequi credito julio', '10000000-0000-4000-8000-000000000002', 'Credito', 'personal', '2026-07-20', '2026-07-20', '{}'),
  ('60000000-0000-4000-8000-000000000014', 'debt_payment', 'scheduled', 170000, 'Claro hogar deuda anterior', '10000000-0000-4000-8000-000000000002', 'Claro hogar', 'personal', '2026-07-20', '2026-07-20', '{"not_monthly_plan":true}'),
  ('60000000-0000-4000-8000-000000000015', 'debt_payment', 'scheduled', 129000, 'Plan celular atrasado', '10000000-0000-4000-8000-000000000002', 'Celular', 'personal', '2026-07-20', '2026-07-20', '{}'),
  ('60000000-0000-4000-8000-000000000016', 'expense', 'scheduled', 820000, 'Arriendo julio', '10000000-0000-4000-8000-000000000005', 'Arriendo', 'personal', '2026-07-25', '2026-07-25', '{"nominal_rent":900000,"real_payment":820000}'),
  ('60000000-0000-4000-8000-000000000017', 'income', 'pending', 100000, 'Sie Travel domingo 26 julio', '10000000-0000-4000-8000-000000000002', 'Experiencia neta', 'sie', '2026-07-26', '2026-07-26', '{}'),
  ('60000000-0000-4000-8000-000000000018', 'income', 'scheduled', 1000000, 'Quincena empresa 30 julio', '10000000-0000-4000-8000-000000000005', 'Salario', 'empresa', '2026-07-30', '2026-07-30', '{}'),
  ('60000000-0000-4000-8000-000000000019', 'income', 'scheduled', 500000, 'Fee redes agosto cobrado en julio', '10000000-0000-4000-8000-000000000002', 'Redes sociales', 'deuxio', '2026-07-30', '2026-07-30', '{"applies_to":"2026-08"}');

insert into public.incomes (id, source_id, business_unit_key, account_id, concept, amount, expected_date, received_date, status, transaction_id) values
  ('70000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002', 'deuxio', '10000000-0000-4000-8000-000000000002', 'Branding arranque 50%', 900000, '2026-07-02', '2026-07-02', 'confirmed', '60000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', 'deuxio', '10000000-0000-4000-8000-000000000002', 'Branding saldo final', 900000, '2026-07-09', null, 'expected', '60000000-0000-4000-8000-000000000005'),
  ('70000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000001', 'empresa', '10000000-0000-4000-8000-000000000005', 'Quincena empresa 15 julio', 1000000, '2026-07-15', null, 'expected', '60000000-0000-4000-8000-000000000008'),
  ('70000000-0000-4000-8000-000000000004', '21000000-0000-4000-8000-000000000001', 'empresa', '10000000-0000-4000-8000-000000000005', 'Quincena empresa 30 julio', 1000000, '2026-07-30', null, 'expected', '60000000-0000-4000-8000-000000000018'),
  ('70000000-0000-4000-8000-000000000005', '21000000-0000-4000-8000-000000000003', 'deuxio', '10000000-0000-4000-8000-000000000002', 'Fee redes agosto cobrado en julio', 500000, '2026-07-30', null, 'expected', '60000000-0000-4000-8000-000000000019'),
  ('70000000-0000-4000-8000-000000000006', '21000000-0000-4000-8000-000000000004', 'sie', '10000000-0000-4000-8000-000000000002', 'Sie Travel domingo 12 julio', 100000, '2026-07-12', null, 'expected', '60000000-0000-4000-8000-000000000007'),
  ('70000000-0000-4000-8000-000000000007', '21000000-0000-4000-8000-000000000004', 'sie', '10000000-0000-4000-8000-000000000002', 'Sie Travel domingo 19 julio', 100000, '2026-07-19', null, 'expected', '60000000-0000-4000-8000-000000000011'),
  ('70000000-0000-4000-8000-000000000008', '21000000-0000-4000-8000-000000000004', 'sie', '10000000-0000-4000-8000-000000000002', 'Sie Travel domingo 26 julio', 100000, '2026-07-26', null, 'expected', '60000000-0000-4000-8000-000000000017');

insert into public.expenses (id, category_id, business_unit_key, account_id, concept, amount, due_date, status, recurring, recurrence, transaction_id, notes) values
  ('71000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000002', 'personal', '10000000-0000-4000-8000-000000000002', 'Gas / credito calentador', 100000, '2026-07-03', 'scheduled', true, 'monthly', '60000000-0000-4000-8000-000000000002', 'Separado del arriendo.'),
  ('71000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000001', 'personal', '10000000-0000-4000-8000-000000000005', 'Arriendo julio', 820000, '2026-07-25', 'scheduled', true, 'monthly', '60000000-0000-4000-8000-000000000016', 'Arriendo nominal 900.000, pago real 820.000.'),
  ('71000000-0000-4000-8000-000000000003', '22000000-0000-4000-8000-000000000008', 'personal', '10000000-0000-4000-8000-000000000002', 'Claro hogar plan nuevo', 70000, '2026-08-20', 'scheduled', true, 'monthly', null, 'Plan futuro deseado, distinto a deuda anterior.');

insert into public.debt_payments (id, debt_id, account_id, amount, due_date, status, transaction_id, notes) values
  ('72000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 740000, '2026-07-04', 'scheduled', '60000000-0000-4000-8000-000000000003', 'Extraordinaria julio'),
  ('72000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 600000, '2026-07-15', 'scheduled', '60000000-0000-4000-8000-000000000009', 'Muere en julio'),
  ('72000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 410000, '2026-07-20', 'scheduled', '60000000-0000-4000-8000-000000000012', 'Recurrente'),
  ('72000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 124000, '2026-07-20', 'scheduled', '60000000-0000-4000-8000-000000000013', '20 meses restantes aprox'),
  ('72000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 607000, '2026-07-15', 'scheduled', '60000000-0000-4000-8000-000000000010', 'Mora desde 2026-06-30'),
  ('72000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', 170000, '2026-07-20', 'scheduled', '60000000-0000-4000-8000-000000000014', 'Deuda anterior Claro hogar'),
  ('72000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002', 129000, '2026-07-20', 'scheduled', '60000000-0000-4000-8000-000000000015', 'Celular atrasado');

insert into public.credit_card_payments (id, credit_card_id, account_id, amount, due_date, status, transaction_id, notes) values
  ('73000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 153000, '2026-07-05', 'scheduled', '60000000-0000-4000-8000-000000000004', 'Falabella julio, 6 meses restantes aprox'),
  ('73000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 273300, '2026-07-10', 'scheduled', '60000000-0000-4000-8000-000000000006', 'Rappi julio, 6-8 meses restantes aprox');

insert into public.credit_card_purchases (id, credit_card_id, business_unit_key, category_id, concept, merchant, amount, installments, monthly_installment, purchase_date, status, notes) values
  ('74000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'personal', '22000000-0000-4000-8000-000000000005', 'Saldo estimado Falabella previo', 'Falabella', 918000, 6, 153000, '2026-07-01', 'active', 'Modelado como saldo estimado por falta de saldo exacto.'),
  ('74000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'personal', '22000000-0000-4000-8000-000000000005', 'Saldo estimado Rappi Card previo', 'RappiCard', 1913100, 7, 273300, '2026-07-01', 'active', 'Modelado como saldo estimado por falta de plazo exacto.');

insert into public.monthly_projections (id, month, opening_balance, expected_income, expected_expenses, debt_payments, card_payments, planned_savings, closing_balance, scenario, notes) values
  ('80000000-0000-4000-8000-000000000001', '2026-07-01', 300000, 4600000, 1049000, 2780000, 426300, 0, 1072700, 'base', 'Cierre julio ajustado al dato de referencia entregado.'),
  ('80000000-0000-4000-8000-000000000002', '2026-08-01', 1072700, 3200000, 1080000, 658000, 426300, 0, 2232400, 'base', 'Incluye agua proyectada 90.000 y empresa con extra conservador.'),
  ('80000000-0000-4000-8000-000000000003', '2026-09-01', 2232400, 2900000, 990000, 658000, 426300, 0, 3182100, 'base', 'Sin agua por ser bimestral.'),
  ('80000000-0000-4000-8000-000000000004', '2026-10-01', 3182100, 3100000, 1080000, 658000, 426300, 0, 4241800, 'base', 'Deuxio sube a 700.000 y agua bimestral.'),
  ('80000000-0000-4000-8000-000000000005', '2026-11-01', 4241800, 3100000, 990000, 658000, 426300, 0, 5267500, 'base', 'Sin agua por ser bimestral.'),
  ('80000000-0000-4000-8000-000000000006', '2026-12-01', 5267500, 3400000, 1080000, 658000, 426300, 0, 6503200, 'base', 'Deuxio sube a 1.000.000 y agua bimestral.');

insert into public.financial_events (id, event_date, title, amount, event_type, status, business_unit_key, account_id, related_table, related_id, notes) values
  ('90000000-0000-4000-8000-000000000001', '2026-08-05', 'Falabella agosto', 153000, 'card_payment', 'scheduled', 'personal', '10000000-0000-4000-8000-000000000002', 'credit_card_payments', null, 'Sigue en agosto.'),
  ('90000000-0000-4000-8000-000000000002', '2026-08-10', 'Rappi Card agosto', 273300, 'card_payment', 'scheduled', 'personal', '10000000-0000-4000-8000-000000000002', 'credit_card_payments', null, 'Sigue en agosto.'),
  ('90000000-0000-4000-8000-000000000003', '2026-08-15', 'Quincena empresa agosto con extras', 1300000, 'income', 'projected', 'empresa', '10000000-0000-4000-8000-000000000005', 'incomes', null, 'Incluye extras conservadores.'),
  ('90000000-0000-4000-8000-000000000004', '2026-08-20', 'Nequi credito agosto', 124000, 'debt_payment', 'scheduled', 'personal', '10000000-0000-4000-8000-000000000002', 'debt_payments', null, 'Recurrente.'),
  ('90000000-0000-4000-8000-000000000005', '2026-08-20', 'Codensa agosto', 410000, 'debt_payment', 'scheduled', 'personal', '10000000-0000-4000-8000-000000000002', 'debt_payments', null, 'Recurrente.'),
  ('90000000-0000-4000-8000-000000000006', '2026-08-20', 'Claro hogar plan nuevo', 70000, 'expense', 'scheduled', 'personal', '10000000-0000-4000-8000-000000000002', 'expenses', null, 'Plan futuro, no deuda anterior.'),
  ('90000000-0000-4000-8000-000000000007', '2026-08-25', 'Arriendo agosto', 820000, 'expense', 'scheduled', 'personal', '10000000-0000-4000-8000-000000000005', 'expenses', null, 'Arriendo real a pagar.'),
  ('90000000-0000-4000-8000-000000000008', '2026-08-30', 'Quincena empresa agosto', 1000000, 'income', 'projected', 'empresa', '10000000-0000-4000-8000-000000000005', 'incomes', null, 'Base mensual.'),
  ('90000000-0000-4000-8000-000000000009', '2026-08-30', 'Deuxio mensual agosto', 500000, 'income', 'projected', 'deuxio', '10000000-0000-4000-8000-000000000002', 'incomes', null, 'Fee redes.'),
  ('90000000-0000-4000-8000-000000000010', '2026-08-31', 'Sie Travel agosto', 400000, 'income', 'projected', 'sie', '10000000-0000-4000-8000-000000000002', 'incomes', null, '100.000 netos por domingo.'),
  ('90000000-0000-4000-8000-000000000011', '2026-08-31', 'Agua agosto', 90000, 'expense', 'projected', 'personal', '10000000-0000-4000-8000-000000000005', 'expenses', null, 'Bimestral.'),
  ('90000000-0000-4000-8000-000000000012', '2026-09-30', 'Deuxio mensual septiembre', 500000, 'income', 'projected', 'deuxio', '10000000-0000-4000-8000-000000000002', 'incomes', null, 'Fee redes.'),
  ('90000000-0000-4000-8000-000000000013', '2026-10-30', 'Deuxio mensual octubre', 700000, 'income', 'projected', 'deuxio', '10000000-0000-4000-8000-000000000002', 'incomes', null, 'Escenario conservador mejorado.'),
  ('90000000-0000-4000-8000-000000000014', '2026-11-30', 'Deuxio mensual noviembre', 700000, 'income', 'projected', 'deuxio', '10000000-0000-4000-8000-000000000002', 'incomes', null, 'Escenario conservador mejorado.'),
  ('90000000-0000-4000-8000-000000000015', '2026-12-30', 'Deuxio mensual diciembre', 1000000, 'income', 'projected', 'deuxio', '10000000-0000-4000-8000-000000000002', 'incomes', null, 'Cuarto mes con posible subida.');

commit;
