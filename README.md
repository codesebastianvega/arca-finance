# Arca

Arca es una app web de control financiero personal + operativo. Esta versión ya quedó reestructurada como base segura para SaaS single-tenant con Supabase Auth, workspaces, RLS y una shell nueva orientada a decisiones.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives propias
- React Hook Form + Zod
- Recharts
- date-fns
- Supabase Auth + Postgres + RLS

## Estado actual

Base implementada:

- landing pública
- pricing pública
- sign in / sign up / onboarding
- shell nueva en `/app/*`
- superadmin base en `/superadmin`
- shell anterior preservada en `/legacy`
- esquema SQL nuevo con tenancy + suscripciones modeladas

## Rutas principales

- `/` marketing
- `/pricing`
- `/sign-in`
- `/sign-up`
- `/onboarding`
- `/app/hoy`
- `/app/mes`
- `/app/cuentas`
- `/app/obligaciones`
- `/app/ahorro`
- `/app/negocios`
- `/app/historial`
- `/app/configuracion`
- `/superadmin`
- `/legacy`

## Arranque local

```bash
npm install
npm run dev
```

Abrir:

```text
http://localhost:3000
```

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase

Archivos clave:

- `supabase/schema.sql`: esquema SaaS single-tenant con RLS real
- `supabase/backfill-single-tenant.sql`: backfill de la data legacy a un workspace dueño
- `supabase/seed.sql`: seed legacy previa
- `supabase/reset-data.sql`: limpieza de data operativa/demo

Secuencia recomendada:

1. Ejecutar `supabase/schema.sql`.
2. Crear o confirmar el usuario dueño en Supabase Auth.
3. Editar `supabase/backfill-single-tenant.sql` con el correo real.
4. Ejecutar `supabase/backfill-single-tenant.sql`.
5. Entrar por `/sign-in` o `/sign-up`.

## Estructura

```text
src/
  app/
    app/
    legacy/
    onboarding/
    pricing/
    sign-in/
    sign-up/
    superadmin/
  components/
  features/
    app-shell/
    dashboard/
    legacy/
  lib/
    auth.ts
    dashboard-data.ts
    finance.ts
    supabase.ts
    types.ts
docs/
  brand-system.md
  mvp-plan.md
  refactor-spec.md
supabase/
  schema.sql
  backfill-single-tenant.sql
```

## Verificación hecha

- `npm run build`
- `npm run lint`

## Próximo paso recomendado

Mover las mutaciones del shell legacy a comandos nuevos workspace-aware y migrar los formularios operativos al shell `/app`.
