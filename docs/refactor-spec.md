# Arca Refactor Spec

Estado actual del refactor: implementado en código y listo para cerrar la migración SQL.

## Objetivo

Mover Arca desde un dashboard monolítico con permisos abiertos a una base de SaaS single-tenant:

- auth con Supabase
- `profiles`, `workspaces`, `workspace_members`
- `subscription_plans`, `workspace_subscriptions`
- `workspace_id` en datos financieros
- RLS por workspace
- shell nueva orientada a decisiones

## Rutas nuevas

- `/` landing pública
- `/pricing` pricing pública
- `/sign-in` acceso
- `/sign-up` registro
- `/onboarding` bootstrap de workspace
- `/app/hoy`
- `/app/mes`
- `/app/cuentas`
- `/app/obligaciones`
- `/app/ahorro`
- `/app/negocios`
- `/app/historial`
- `/app/configuracion`
- `/superadmin`
- `/legacy` shell anterior preservada como baseline

## Módulos base

- `src/features/app-shell/*`: navegación, layout y shell protegida
- `src/features/dashboard/*`: servicios y vista principal orientada a decisiones
- `src/lib/auth.ts`: contexto de usuario/workspace y guards
- `src/lib/supabase.ts`: browser client, server client con cookies y admin client
- `src/lib/dashboard-data.ts`: read model con modo `supabase` y fallback `legacy`
- `src/app/auth-actions.ts`: sign in, sign up, sign out y bootstrap

## Regla de datos canónica

- `transactions`: movimientos ya posteados
- `scheduled_events`: entradas y obligaciones futuras
- `debts`, `credit_cards`, `savings_goals`, `business_units`: agregados de estado
- `financial_events`: compatibilidad legacy mientras se migra a `scheduled_events`

## Qué queda protegido por SQL

- lectura y escritura atadas a `workspace_id`
- `profiles` visibles al propio usuario o superadmin
- `workspaces` visibles por membresía
- `workspace_subscriptions` visibles por membresía
- `superadmin` soportado desde `profiles.is_superadmin`

## Secuencia de migración recomendada

1. Ejecutar `supabase/schema.sql`.
2. Crear al menos un usuario real en Supabase Auth.
3. Editar `supabase/backfill-single-tenant.sql` con el correo del dueño.
4. Ejecutar `supabase/backfill-single-tenant.sql`.
5. Entrar por `/sign-in` o `/sign-up`.
6. Verificar `/app/hoy`.
7. Usar `/legacy` solo como referencia si algo no coincide todavía.

## Riesgos que este refactor ya reduce

- tablas financieras públicas
- mutaciones de usuario dependientes del service role como camino principal
- navegación mezclada por categoría en vez de por decisión
- dependencia total de `src/app/page.tsx`

## Siguiente capa sugerida

- reemplazar `src/app/actions.ts` por comandos workspace-aware
- migrar formularios del shell legacy al shell nuevo
- convertir deudas y tarjetas a detalle modal + amortización real
- agregar calendario en cuadrícula y notificaciones
- conectar billing real detrás del adapter de suscripciones
