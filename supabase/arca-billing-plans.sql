-- Catálogo comercial inicial de Arca. Seguro para ejecutar varias veces.
insert into public.subscription_plans (code, name, monthly_price_cop, yearly_price_cop, active, metadata)
values
  (
    'free',
    'Arca Gratis',
    0,
    null,
    true,
    jsonb_build_object(
      'ai_monthly_limit', 20,
      'catalog_version', 2,
      'description', 'Control financiero esencial con una primera ayuda de Nova.',
      'features', jsonb_build_array('Hasta 2 cuentas', 'Movimientos manuales', 'Agenda y presupuesto básico', '20 consultas de Nova al mes')
    )
  ),
  (
    'personal_pro',
    'Arca Personal',
    14900,
    null,
    true,
    jsonb_build_object(
      'ai_monthly_limit', 150,
      'catalog_version', 2,
      'description', 'Tu dinero organizado y acompañado por Nova.',
      'features', jsonb_build_array('Cuentas ilimitadas', 'Nova y automatizaciones', 'Planeación y proyección', 'Metas y recordatorios')
    )
  ),
  (
    'business',
    'Arca Negocios',
    39900,
    null,
    true,
    jsonb_build_object(
      'ai_monthly_limit', 500,
      'catalog_version', 2,
      'description', 'Control personal y operativo para proyectos y negocios.',
      'features', jsonb_build_array('Todo Arca Personal', 'Unidades de negocio', 'Contratos, facturas y cobros', 'Métricas por proyecto y exportación')
    )
  )
on conflict (code) do update
set
  name = excluded.name,
  monthly_price_cop = excluded.monthly_price_cop,
  yearly_price_cop = excluded.yearly_price_cop,
  active = excluded.active,
  metadata = excluded.metadata,
  updated_at = now()
where coalesce((public.subscription_plans.metadata ->> 'catalog_version')::integer, 0) < 2;
