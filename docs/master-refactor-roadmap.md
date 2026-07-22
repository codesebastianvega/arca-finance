# Roadmap Maestro: Auditoría y Arquitectura (Arca)

Este documento es la hoja de ruta definitiva paso a paso para asegurar, optimizar y refactorizar Arca. Se debe seguir de manera secuencial, priorizando la seguridad e integridad de datos antes de pasar a las mejoras de la interfaz y estructura del código.

---

## Fase 1: Blindaje de Seguridad y RLS (Row-Level Security)
**Objetivo:** Garantizar que los usuarios solo puedan acceder a sus propios datos, eliminando la vulnerabilidad del cliente de administrador en las operaciones diarias.

- [x] 1.1 **Auditoría de Políticas en Supabase:** Verificar o crear las políticas de RLS en todas las tablas transaccionales (`accounts`, `transactions`, `credit_cards`, `savings_goals`, etc.) para que operen en base al `user_id` asociado al `workspace_id`.
- [x] 1.2 **Refactorización de `auth.ts` y Middleware:** Crear un cliente SSR de base de datos robusto y eliminar/deprecar `getSupabaseAdminClient()` para uso público.
- [x] 1.3 **Migración de `actions.ts` (Lectura y Escritura):** Cambiar sistemáticamente todos los Server Actions que usan `adminClient` por el cliente SSR seguro.
- [x] 1.4 **Verificación de Seguridad:** Ejecutar pruebas para certificar que sin el `adminClient`, las escrituras fallan si un usuario intenta enviar un `workspace_id` ajeno (IDOR check).

---

## Fase 2: Integridad Transaccional (Prevención de Race Conditions)
**Objetivo:** Impedir la sobreescritura de saldos y asegurar la consistencia matemática ante peticiones simultáneas.

- [x] 2.1 **Creación de Funciones RPC en Supabase:** Programar procedimientos almacenados en SQL para operaciones matemáticas críticas. Ej: `increment_account_balance(account_id, amount)`.
- [x] 2.2 **Migración de `confirmScheduledEventNow`:** Adaptar la lógica para llamar a las funciones RPC en vez de calcular el saldo en Node.js.
- [x] 2.3 **Migración de Creación de Transacciones / Transferencias:** Adaptar el flujo de transferencias entre cuentas para ser transaccional (todo o nada).
- [x] 2.4 **Migración de Manejo de Tarjetas y Créditos:** Hacer atómicos los pagos de cuotas (modificar `used` o `paidInstallments` mediante RPC).

---

## Fase 3: Optimización de Rendimiento (Data Fetching y Paginación)
**Objetivo:** Eliminar el Overfetching, mejorando radicalmente el tiempo de carga de la app (TTFB) y el uso de memoria.

- [x] 3.1 **Desmantelar Overfetching:** Optimizar consultas iniciales de historial y ViewModel.
- [x] 3.2 **Implementar Paginación Server-side:** Paginación diferida por bloques de movimientos (`fetchPaginatedHistoryPage`).
- [ ] 3.3 **Suspense y RSC (React Server Components):** Aislar la carga de datos por componentes independientes.

---

## Fase 4: Refactorización Arquitectónica (Feature Sliced Design)
**Objetivo:** Descomponer el "monolito" (`actions.ts` y pantallas gigantes) para escalar el equipo de desarrollo y aislar los errores.

- [x] 4.1 **Creación de la Estructura Base:** Configurar carpetas de backend `/src/features/[dominio]/actions.ts`.
- [x] 4.2 **Migración de Cuentas (Accounts):** Actions modulares en `src/features/accounts/actions.ts`.
- [x] 4.3 **Migración de Ahorros y Bolsillos:** Actions modulares en `src/features/savings/actions.ts`.
- [x] 4.4 **Migración de Préstamos y Deudas:** Actions modulares en `src/features/loans/actions.ts`.
- [x] 4.5 **Migración de Obligaciones y Agenda:** Actions modulares en `src/features/obligations/actions.ts`.

---

## Fase 5: Estabilidad y Experiencia de Usuario (UI/UX)
**Objetivo:** Evitar re-renderizados innecesarios y proteger la base de datos de datos inválidos (Validación).

- [x] 5.1 **Integración de Zod:** Definir esquemas (`financial-schemas.ts`) para validar todos los Server Actions en backend antes de llegar a Supabase.
- [x] 5.2 **Manejo Centralizado de Errores (Toasts Elegantes):** Proveedor global `ToastProvider` con animaciones de Framer Motion y notificaciones hápticas.

---

## Fase 6: Resiliencia y Mejoras Finales (Post-Lanzamiento)
**Objetivo:** Preparar la aplicación para picos de tráfico y uso en condiciones de baja conectividad.

- [x] 6.1 **Índices de Base de Datos:** Script de migración SQL (`20260722_add_performance_indexes.sql`) con índices compuestos B-Tree para Supabase.
- [x] 6.2 **Soporte Offline & PWA:** Configurado Service Worker y caché resiliente de red.
- [x] 6.3 **Optimizaciones Locales (Optimistic Updates & Haptics):** Respuesta táctil háptica inmediata y toques dinámicos en todas las acciones.
