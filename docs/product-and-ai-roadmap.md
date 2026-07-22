# Roadmap de Producto, IA y Nuevas Funcionalidades: Arca Finance

Este documento establece la hoja de ruta para la evolución de la IA Nova, la gestión de límites de consumo por cuotas/tokens, el desacople visual de pantallas y la implementación de la nueva funcionalidad de **Cadenas de Ahorro / Natilleras** (Finanzas Colaborativas en Colombia).

---

## Fase 1: Control de Cuotas de Tokens y Planes de Uso de la IA (Nova)
**Objetivo:** Reemplazar el conteo simple de entradas por un control de **Tokens Máximos (Diarios / Mensuales)** para escalar la capacidad de la IA de manera eficiente.

- [ ] 1.1 **Medidor de Consumo de Tokens (Server Actions & Supabase):**
  - Registrar el uso de tokens por interacción con el modelo de IA en la tabla de uso del workspace.
- [ ] 1.2 **Cálculo Porcentual de Cuota:**
  - Determinar automáticamente el `% usado` y el `% restante` según el plan asignado (Gratuito / VIP / Pro).
- [ ] 1.3 **Componente UI de Cuota en la Interfaz de Nova:**
  - Barra de progreso discreta y elegante en la vista del Chat con Nova indicando el porcentaje de la cuota consumida.
- [ ] 1.4 **Alertas de Límite de Cuota:**
  - Notificaciones Toasts y mensajes informativos cuando el usuario alcance el 80% y 100% de su límite diario/mensual.

---

## Fase 2: Autonomía Agéntica Completa de Nova (Control Total & Navegación)
**Objetivo:** Permitir que Nova ejecute cualquier acción administrativa en la app sin requerir que el usuario la haga manualmente.

- [ ] 2.1 **Gestión Completa de Categorías y Proyectos:**
  - Conectar herramientas a Nova para crear, renombrar, cambiar color o eliminar categorías de gastos y unidades/proyectos.
- [ ] 2.2 **Control de Navegación y Preferencias:**
  - Tool `navigate_to_screen`: Permitir que Nova abra la configuración, la vista de cuentas o la agenda al pedírselo.
  - Tool `change_app_theme`: Cambiar el tema visual de la aplicación (Oscuro / Claro) mediante comandos en lenguaje natural.
- [ ] 2.3 **Ejecución Directa con Confirmación Táctil:**
  - Integrar tarjetas interactivas de aprobación para acciones críticas (borrado de categorías o movimientos).

---

## Fase 3: Refactorización UI de Pantallas Monolíticas
**Objetivo:** Descomponer vistas extensas (`ConfiguracionScreen.tsx`) en componentes reutilizables por carpeta de feature.

- [ ] 3.1 **Descomponer `ConfiguracionScreen.tsx`:**
  - Extraer `<AccountManagerView>`, `<CategoryManagerView>` y `<SavingsManagerView>` a sus respectivas carpetas en `/src/features/`.
- [ ] 3.2 **Estandarización de Modales de Edición:**
  - Mover los modales de creación y edición a `/src/features/[dominio]/components/`.

---

## Fase 4: Módulo de Cadenas de Ahorro / Natilleras (Colombia)
**Objetivo:** Permitir la creación, seguimiento y proyección de las Cadenas de Ahorro tradicionales en Colombia (Cadenas, Rondas, Natilleras).

- [ ] 4.1 **Modelado de Datos (Supabase Schema & Types):**
  - Crear tabla `savings_chains` (nombre, cuota periódica, frecuencia: semanal/quincenal/mensual, total de turnos, fecha de inicio, estado).
  - Crear tabla `savings_chain_members` (nombre del integrante, número de turno asignado, estado de pago del turno actual).
- [ ] 4.2 **Gestión y Asignación de Turnos:**
  - Configuración de la fecha en la que le corresponde cobrar la bolsa total al usuario.
  - Cálculo automático del monto total a recibir (`cuota * número de integrantes`).
- [ ] 4.3 **Integración con la Agenda Financiera y Flujo de Caja:**
  - Registrar los pagos periódicos del usuario a la cadena como compromisos programados.
  - Registrar el cobro del turno del usuario como un **Ingreso Esperado** proyectado en el Calendario.
- [ ] 4.4 **Interfaz Visual de Cadenas de Ahorro:**
  - Vista dedicada con tarjetas de progreso por turno, estado de pagos de la ronda actual e indicador de próximo cobro.
