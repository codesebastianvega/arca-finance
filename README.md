# Arca

Arca es una app web de control financiero personal + operativo.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- React Hook Form + Zod
- Recharts
- date-fns
- Supabase-ready architecture

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

Si ya tienes el proyecto Supabase creado, puedes pegar esos valores directo en `.env.local`.

## Supabase

- `supabase/schema.sql` contiene la base de tablas y policies iniciales.
- Pega ese SQL en el editor de Supabase para crear la estructura.
- La app usa Supabase si encuentra las variables de entorno; si no, cae a mock local.

## Estructura inicial

- `src/app/page.tsx` dashboard principal
- `src/app/layout.tsx` layout global
- `src/components/arca-charts.tsx` graficos
- `src/components/ui-kit.tsx` botones, cards, badges y metricas
- `src/lib/mock-data.ts` datos mock
- `src/lib/finance.ts` calculos
- `src/lib/supabase.ts` cliente preparado para Supabase
- `docs/mvp-plan.md` alcance y decisiones

## Siguiente paso

Conectar este repo a GitHub, luego a Vercel, y despues activar Supabase para persistencia real y MCP.
