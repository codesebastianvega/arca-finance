# Roadmap Nivel 2: Notificaciones, Reportes y Simuladores Financieros - Arca Finance

Este documento define la siguiente gran etapa de innovación para Arca Finance: Notificaciones automáticas Web Push, Generación de Reportes en PDF/Excel y el Simulador de Estrategia de Deudas.

---

## Fase 5: Notificaciones Web Push y Cron de Recordatorios Automáticos 🔔
**Objetivo:** Notificar proactivamente al usuario sobre vencimientos de cuotas, pagos de tarjetas y recaudo de cadenas de ahorro.

- [ ] 5.1 **Configuración del Service Worker & VAPID Web Push:**
  - Suscripción a notificaciones push navegadores/PWA.
- [ ] 5.2 **Cron Job de Notificaciones (`/api/cron/financial-reminders`):**
  - Ejecución diaria automática para enviar alertas de compromisos a vencer en 1 y 3 días.

---

## Fase 6: Exportación de Reportes Financieros en PDF y Excel 📄
**Objetivo:** Permitir descargar extractos y matrices de recaudo para compartir con terceros o guardar registros personales.

- [ ] 6.1 **Exportador de Cadenas de Ahorro y Natilleras:**
  - Generar tabla de recaudo y turnos en formato imprimible/PDF o CSV/Excel.
- [ ] 6.2 **Extracto Mensual del Workspace:**
  - Resumen de ingresos, gastos por categoría y balance final.

---

## Fase 7: Simulador de Estrategia de Deudas (Bola de Nieve vs. Avalancha) 🎯
**Objetivo:** Herramienta interactiva para proyectar el pago acelerado de créditos y tarjetas.

- [ ] 7.1 **Calculadora Bola de Nieve (Menor saldo primero):**
  - Visualización del impacto psicológico y fechas de liberación de deuda.
- [ ] 7.2 **Calculadora Avalancha (Mayor tasa de interés primero):**
  - Proyección del ahorro total en intereses y comparación de estrategias.
