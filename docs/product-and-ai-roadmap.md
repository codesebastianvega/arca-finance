# Roadmap de Producto, IA y Nuevas Funcionalidades: Arca Finance

Este documento establece la hoja de ruta para la evolución de la IA Nova, la gestión de límites de consumo por cuotas/tokens, el desacople visual de pantallas y la implementación de la nueva funcionalidad de **Cadenas de Ahorro / Natilleras** (Finanzas Colaborativas en Colombia).

---

## Fase 1: Control de Cuotas de Tokens y Planes de Uso de la IA (Nova)
**Objetivo:** Reemplazar el conteo simple de entradas por un control de **Tokens Máximos (Diarios / Mensuales)** para escalar la capacidad de la IA de manera eficiente.

- [x] 1.1 **Medidor de Consumo de Tokens (Server Actions & Supabase):** Conteo automático con `onFinish` en `ai_usage_events`.
- [x] 1.2 **Cálculo Porcentual de Cuotas Diarias por Niveles:** 20.000 (Gratis), 50.000 (Personal) y 200.000 (Pro) + Límite Global de 1.000.000 de tokens/día.
- [x] 1.3 **Componente UI de Cuota en la Interfaz de Nova:** Barra de progreso con estado dinámico en vivo en la cabecera del chat con Nova.
- [x] 1.4 **Alertas de Límite de Cuota:** Mensaje automático al llegar al 100% de la cuota diaria con reinicio automático a medianoche.

---

## Fase 2: Autonomía Agéntica Completa de Nova (Control Total & Navegación)
**Objetivo:** Permitir que Nova ejecute cualquier acción administrativa en la app sin requerir que el usuario la haga manualmente.

- [x] 2.1 **Gestión Completa de Categorías y Proyectos:** Herramientas activas para crear, renombrar, cambiar color o eliminar categorías de gastos y proyectos desde el chat.
- [x] 2.2 **Control de Navegación y Preferencias:** Directiva agéntica con `navigate_to_screen` y `change_app_theme` para navegación y temas en tiempo real.
- [x] 2.3 **Ejecución Directa con Confirmación Táctil:** Tarjetas interactivas de aprobación de 1 clic para todas las operaciones administrativas.

---

## Fase 3: Refactorización UI de Pantallas Monolíticas
**Objetivo:** Descomponer vistas extensas (`ConfiguracionScreen.tsx`) en componentes reutilizables por carpeta de feature.

- [x] 3.1 **Descomponer `ConfiguracionScreen.tsx`:** Extraídos `<AccountManagerView>`, `<CategoryManagerView>`, `<IncomeSourceManagerView>`, `<ProjectManagerView>` y `<ThemeManagerView>` en `/src/features/`.
- [x] 3.2 **Estandarización de Modales de Edición:** Formularios y modales de edición encapsulados en sus respectivos componentes de dominio.

---

## Fase 4: Módulo de Cadenas de Ahorro / Natilleras (Colombia)
**Objetivo:** Permitir la creación, seguimiento y proyección de las Cadenas de Ahorro tradicionales en Colombia (Cadenas, Rondas, Natilleras).

- [x] 4.1 **Modelado de Datos (Supabase Schema & Types):** Tablas `savings_chains` y `savings_chain_members` con RLS en `20260723_create_savings_chains.sql`.
- [x] 4.2 **Gestión y Asignación de Turnos (Wizard Typeform):** Sorteo aleatorio 🎲 y asignación manual de turnos en 5 pasos.
- [x] 4.3 **Integración con la Agenda Financiera, WhatsApp y Nova:** Proyección automática en calendario, recordatorios directos por WhatsApp en 1 clic y herramienta `get_savings_chains` en Nova.
- [x] 4.4 **Interfaz Visual Dedicada (`CadenasScreen.tsx`):** Tablero multicadena, matriz por ronda con entrega de bolsa y recordatorios.
