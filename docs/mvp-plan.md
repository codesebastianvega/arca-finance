# MVP app financiera personal + operativa

Fecha: 2026-07-02

## Decision corta

Construiremos una app web llamada **Arca**.

La idea central no es contabilidad. Es un panel para responder rapido:

> Cuanta plata tengo disponible hoy, que se vence pronto, cuanto debo, cuanto entra este mes, que negocio deja utilidad y cuanto puedo ahorrar sin ahogarme.

## Nombre

Nombre elegido: **Arca**.

Por que:

- Suena premium, sobrio y financiero.
- Comunica resguardo, control y patrimonio sin sonar contable.
- Sirve para plata personal, operativa, deudas, tarjetas y metas.
- Es corto, facil de recordar y puede crecer como producto.
- Permite una voz de asistente clara: "Arca, registra este gasto" o "Arca, dime que debo pagar esta semana".

Otros nombres posibles:

- Caja Clara
- Flujo Vivo
- Bolsillo Pro
- Norte Caja
- Mapa Plata
- Control Caja
- PlaniCaja
- Faro
- Clario
- Boveda

## Stack recomendado

Para empezar rapido y quedar listo para crecer:

- Framework: **Next.js App Router**
- Lenguaje: **TypeScript**
- UI: **Tailwind CSS + shadcn/ui**
- Iconos: **lucide-react**
- Graficos: **Recharts**
- Formularios: **React Hook Form + Zod**
- Estado cliente: **Zustand** o store propio simple
- Persistencia inicial: **localStorage/IndexedDB con datos mock**
- Persistencia real siguiente fase: **Supabase Postgres + Auth**
- Capa IA futura temprana: **MCP server + intent parser financiero**
- Hosting de prueba: **Netlify**
- Repo remoto: **GitHub**

Decision de DB:

- Para prototipo usable hoy: **sin DB real**, con persistencia local en el navegador y mock data realista.
- Para usarla de verdad en varios dispositivos: **si necesitamos DB**, idealmente Supabase.
- No conviene empezar con SQLite/Prisma si el objetivo es usarla online en Netlify, porque SQLite local no resuelve sincronizacion entre celular/escritorio.

Arquitectura de datos recomendada:

- Crear desde el inicio una capa `repositories` o `storage`.
- La UI no debe depender directamente de `localStorage`.
- Asi cambiamos luego de almacenamiento local a Supabase sin rehacer las pantallas.
- Crear desde el inicio una capa de servicios de dominio (`financeService`) que pueda ser usada por la app, API y MCP.
- Las reglas de calculo y validacion deben vivir fuera de los componentes visuales.

## Hosting

Recomendacion: probar **Netlify** en este proyecto.

Motivo:

- Netlify soporta Next.js moderno con App Router usando OpenNext.
- Permite deploy desde GitHub y preview URLs.
- Sirve para aprender un flujo distinto a Vercel.

Precauciones:

- Evitar dependencias demasiado especificas de Vercel en el MVP.
- Mantener la app como Next.js estandar.
- Si luego usamos funciones, server actions complejas o auth, validar cada feature en Netlify antes de construir mucho encima.

Flujo recomendado:

1. Crear repo local.
2. Subirlo a GitHub.
3. Conectar GitHub con Netlify.
4. Deploy automatico desde `main`.
5. Usar previews para cambios futuros.

Fuentes tecnicas revisadas:

- Netlify Next.js docs: https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- Netlify Git workflows: https://docs.netlify.com/build/git-workflows/overview/
- Next.js deployment docs: https://nextjs.org/docs/app/getting-started/deploying

## Producto MVP

El MVP debe priorizar claridad diaria sobre cantidad de reportes.

Pantallas minimas:

1. Dashboard
2. Cuentas / billeteras
3. Ingresos
4. Gastos
5. Deudas
6. Tarjetas
7. Ahorro
8. Proyeccion mensual
9. Negocios / unidades de negocio
10. Calendario financiero

Pero la experiencia principal no debe ser navegar por diez formularios. Debe existir una accion global:

> + Registrar movimiento

Ese flujo debe permitir registrar en menos de 20 segundos:

- ingreso
- gasto
- pago
- deuda
- compra con tarjeta
- transferencia entre cuentas
- aporte/retiro de ahorro

Ademas, Arca debe prepararse para una operacion conversacional:

> "Gaste 38 mil de Nequi en almuerzo."

La IA deberia inferir:

- tipo: gasto
- monto: 38000
- cuenta: Nequi
- categoria: Alimentacion
- subcategoria: Almuerzo
- unidad: Personal
- fecha: hoy
- estado: pagado

Y responder:

> "Listo. Registre $38.000 como almuerzo desde Nequi. Te quedan $X en Nequi y $Y disponibles esta semana."

## Modulos del MVP

### 1. Dashboard

Debe mostrar arriba:

- Disponible real hoy
- Ingresos del mes
- Gastos del mes
- Falta por pagar
- Deuda total
- Utilidad estimada
- Saldo proyectado fin de mes

Bloques secundarios:

- Proximos 7 dias
- Proximos 15 dias
- Proximos 30 dias
- Ingresos por fuente
- Gastos por categoria
- Resultado por negocio
- Metas de ahorro
- Ultimos movimientos

### 2. Cuentas / billeteras

Campos:

- nombre
- tipo: efectivo, banco, billetera, ahorro, otro
- saldo actual
- color/icono
- estado: activa, archivada

Funciones:

- crear, editar, archivar
- mover plata entre cuentas
- ver historial

### 3. Ingresos

Campos:

- fecha esperada
- fecha real
- monto
- unidad: Empresa, Deuxio, Sie Travel, Aluna, Otros
- subfuente/cliente
- concepto
- estado: esperado, confirmado, cancelado
- cuenta destino
- notas

### 4. Gastos

Campos:

- fecha de vencimiento
- fecha real de pago
- monto
- categoria
- subcategoria
- cuenta origen
- metodo: efectivo, cuenta, tarjeta
- estado: pendiente, pagado, vencido
- recurrente
- frecuencia
- unidad relacionada
- notas

### 5. Deudas

Campos:

- nombre
- entidad/persona
- tipo
- saldo total estimado
- valor cuota
- cuotas totales
- cuotas pagadas
- fecha pago mensual
- tasa opcional
- estado: activa, saldada, vencida, mora
- prioridad
- notas

Calculos:

- meses restantes
- total pagado
- total faltante
- pago del mes
- proxima fecha de pago

### 6. Tarjetas

Campos:

- nombre
- entidad
- cupo total
- cupo usado
- cupo disponible
- fecha de corte
- fecha limite de pago
- pago minimo
- saldo actual
- tasa opcional
- estado

Compras:

- fecha
- comercio/concepto
- monto
- numero de cuotas
- cuota mensual
- categoria
- tarjeta usada
- incluida en saldo

### 7. Ahorro y metas

Campos:

- nombre
- meta
- saldo actual
- fecha objetivo
- prioridad
- color/icono

Calculos:

- faltante
- porcentaje de avance
- aporte mensual sugerido

Regla: el ahorro separado no cuenta como disponible libre.

### 8. Proyeccion mensual

Por mes:

- saldo inicial
- ingresos esperados
- ingresos confirmados
- gastos esperados
- pagos de deuda
- pagos de tarjeta
- ahorro planeado
- saldo final proyectado
- diferencia real vs proyectado

Escenarios:

- confirmado
- conservador
- esperado

### 9. Negocios / unidades

Unidades iniciales:

- Empresa
- Deuxio / redes / diseno
- Sie Travel
- Aluna
- Personal / otros

Por unidad:

- ingresos del mes
- gastos directos
- utilidad estimada
- margen estimado
- proximos cobros
- proximos pagos
- tendencia mensual

Lenguaje: usar "utilidad estimada", no "utilidad contable".

### 10. Calendario financiero

Eventos:

- ingresos esperados
- gastos vencidos/proximos
- deudas
- tarjetas
- cobros de clientes
- recurrentes

Filtros:

- todo
- ingresos
- gastos
- deudas
- tarjetas
- negocio

## Modelo de datos inicial

Entidades minimas:

- `Account`
- `BusinessUnit`
- `Category`
- `Transaction`
- `ScheduledPayment`
- `Debt`
- `CreditCard`
- `CardPurchase`
- `SavingsGoal`
- `CalendarEvent`

Campo comun recomendado:

- `id`
- `createdAt`
- `updatedAt`
- `notes`
- `status`

Movimiento minimo:

```ts
type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "debt_payment"
  | "card_payment"
  | "saving_contribution"
  | "saving_withdrawal";
```

Estados base:

- `pending`
- `paid`
- `confirmed`
- `cancelled`
- `overdue`
- `scheduled`

## MCP + IA conversacional

Arca debe poder gestionarse desde una IA externa mediante un MCP server. La app visual sigue siendo importante, pero la operacion diaria debe poder hacerse sin abrir el dashboard.

Objetivo:

> Que el usuario hable en lenguaje natural y Arca registre, clasifique, calcule impacto y devuelva un resumen accionable.

Ejemplos:

```text
"Gaste 38 mil de Nequi en almuerzo."
```

Resultado esperado:

- crear gasto por $38.000
- cuenta origen: Nequi
- categoria: Alimentacion
- subcategoria: Almuerzo
- unidad: Personal
- fecha: hoy
- estado: pagado
- actualizar saldo de Nequi
- recalcular disponible real
- responder con impacto semanal/mensual

```text
"Hoy adquiri una deuda nueva con Solventa por $900.000 para pagar el dia 15 de cada mes."
```

Resultado esperado:

- crear deuda activa
- entidad: Solventa
- saldo inicial: $900.000
- fecha de pago mensual: dia 15
- estado: activa
- crear pago programado mensual si se conoce la cuota
- si no se conoce cuota, preguntar: "Cual es el valor de la cuota o pago minimo?"
- mostrar proximo vencimiento y efecto en pagos del mes

```text
"Use la tarjeta Nu en mercado por $180.000 a 3 cuotas."
```

Resultado esperado:

- crear compra de tarjeta
- tarjeta: Nu
- categoria: Alimentacion / Mercado
- monto: $180.000
- cuotas: 3
- cuota mensual estimada: $60.000
- actualizar cupo usado/disponible
- crear obligaciones futuras segun fecha de corte y fecha limite de pago
- avisar cuando se debe pagar y cuanto impacta el mes

### Herramientas MCP iniciales

- `create_transaction`
- `create_expense`
- `create_income`
- `create_debt`
- `update_debt`
- `create_credit_card_purchase`
- `mark_payment_paid`
- `create_transfer`
- `create_savings_contribution`
- `get_today_available_cash`
- `get_upcoming_payments`
- `get_month_summary`
- `get_business_unit_summary`
- `get_credit_health_summary`
- `search_transactions`
- `correct_transaction`

### Parser financiero

Arca debe incluir un `FinancialIntentParser` que:

1. Detecte intencion: gasto, ingreso, deuda, tarjeta, transferencia, ahorro, consulta o correccion.
2. Extraiga monto, cuenta, categoria, fecha, unidad, entidad, tarjeta, cuotas y concepto.
3. Aplique reglas del usuario.
4. Calcule confianza.
5. Registre directo si la confianza es alta.
6. Pida confirmacion si la confianza es media.
7. Pregunte datos faltantes si la confianza es baja.

Reglas iniciales de inferencia:

- "almuerzo", "desayuno", "comida", "mercado" => Alimentacion.
- "uber", "didi", "taxi", "bus", "gasolina" => Transporte.
- "hosting", "dominio", "servidor", "software" => Software / herramientas.
- "Aluna", "restaurante", "plan mensual", "SaaS" => unidad Aluna.
- "Sie", "caminata", "experiencia", "guia", "reserva", "transporte turistico" => unidad Sie Travel.
- "redes", "diseno", "branding", "flyer", "cliente redes" => unidad Deuxio.
- "Solventa", "Codensa", "credito", "prestamo", "cuota" => deuda.
- "tarjeta", nombres de tarjetas, "a cuotas" => compra o pago de tarjeta.

### Confirmaciones y seguridad

Registrar directo si:

- hay monto claro
- hay cuenta clara o cuenta por defecto confiable
- la categoria es obvia
- el impacto es bajo

Pedir confirmacion si:

- el monto es alto
- se va a crear una deuda nueva
- se va a marcar una deuda como saldada
- se va a borrar informacion
- hay dos cuentas/tarjetas posibles
- falta fecha de pago o cuota

Nunca hacer sin confirmacion:

- eliminar registros
- marcar deuda completa como saldada
- cambiar saldo manual grande
- mover plata entre cuentas por montos altos
- crear reglas recurrentes permanentes con datos incompletos

### Vida crediticia

Para tarjetas y deudas, Arca debe enfocarse en prevenir mora y mejorar habitos:

- mostrar fecha de corte
- mostrar fecha limite de pago
- calcular pago minimo si se registra
- estimar cuota mensual por compras a cuotas
- alertar 7 dias antes, 48 horas antes y el dia de vencimiento
- separar "pago minimo" de "pago recomendado"
- sugerir pagar antes de fecha limite
- mostrar tarjetas cerca del cupo
- mostrar deuda mensual comprometida contra ingresos del mes

Lenguaje recomendado:

- "Esta compra suma $60.000 a tus pagos mensuales durante 3 meses."
- "La tarjeta Nu vence el 12. Te conviene pagar antes de esa fecha para evitar mora."
- "Tus pagos de deuda este mes ya representan el 31% de tus ingresos confirmados."

## Reglas de calculo

Disponible real hoy:

```text
saldo_total_cuentas
- pagos_obligatorios_7_dias
- pagos_vencidos
- minimos_de_deuda
- ahorro_no_tocable
= disponible_real_hoy
```

Ingresos proyectados del mes:

```text
ingresos_confirmados_mes + ingresos_esperados_pendientes
```

Flujo neto:

```text
ingresos_confirmados - gastos_pagados - pagos_deuda - pagos_tarjeta
```

Utilidad estimada por negocio:

```text
ingresos_recibidos_unidad - gastos_directos_unidad
```

Deuda total:

```text
suma(saldo_deudas_activas) + suma(saldo_tarjetas)
```

## Alertas MVP

La app debe avisar dentro del dashboard, calendario y lista de proximos pagos.

No usaremos notificaciones externas en la primera version si no hay usuario/DB. Las alertas seran visuales dentro de la app. Luego podemos agregar email, push o WhatsApp.

Alertas iniciales:

- Pago proximo: vence en 7 dias
- Pago critico: vence en 48 horas
- Pago vencido: fecha menor a hoy y no pagado
- Disponible bajo: disponible real menor al minimo definido
- Deuda pesada: pagos de deuda del mes superan cierto porcentaje del ingreso
- Negocio en perdida: gastos de unidad superan ingresos
- Ingreso esperado no recibido: fecha esperada paso y sigue pendiente
- Ahorro en riesgo: no alcanza para pagos + aporte minimo
- Tarjeta cerca del limite: cupo usado supera umbral configurable

Ejemplos de copy:

- "Tienes $1.600.000 disponibles, pero $1.100.000 se vencen en los proximos 7 dias."
- "La tarjeta vence en 2 dias."
- "Sie Travel tiene utilidad este mes, pero aun hay cobros pendientes."

## UX/UI

Estilo:

- SaaS moderno
- claro, rapido, visual
- fondo claro
- buen contraste
- colores funcionales, no decorativos

Colores sugeridos:

- verde: ingreso / saludable
- rojo: gasto / riesgo
- azul: proyeccion
- ambar: alerta
- gris: estructura

Desktop:

- sidebar fija
- grilla de metricas
- tablas compactas
- panel de alertas

Mobile:

- bottom nav: Dashboard, Registrar, Calendario, Mas
- formularios en bottom sheet
- tablas convertidas en listas
- sin necesidad de zoom

Componentes reutilizables:

- `MetricCard`
- `MoneyInput`
- `TransactionRow`
- `StatusBadge`
- `EmptyState`
- `QuickCaptureDrawer`
- `AccountSelector`
- `CategoryPicker`
- `DateRangeFilter`
- `FinancialChart`
- `AlertBanner`
- `ResponsiveDataTable`

## Lo que NO va en v1

- integracion bancaria
- contabilidad formal
- PUC
- impuestos avanzados
- facturacion electronica
- conciliacion automatica
- multiusuario con roles
- app movil nativa
- IA predictiva
- reportes contables complejos
- integracion con Nequi/Daviplata/bancos

## Roadmap

### Fase 0: Documento y setup

- definir nombre provisional
- crear repo
- escoger stack
- scaffold Next.js
- instalar UI base
- crear datos mock

### Fase 1: MVP local usable

- layout responsive
- dashboard
- CRUD local
- captura rapida
- filtros basicos
- calculos principales
- calendario simple
- deploy en Netlify

### Fase 2: Persistencia real

- Supabase Auth
- Supabase Postgres
- migracion desde datos locales/mock
- backups/export CSV
- uso desde varios dispositivos
- API interna estable para que app visual y MCP usen la misma logica

### Fase 3: MCP e IA conversacional

- MCP server de Arca
- herramientas para CRUD financiero
- `FinancialIntentParser`
- registro conversacional de gastos, ingresos, deudas y tarjetas
- confirmaciones para acciones sensibles
- resumen automatico despues de cada accion
- historial/auditoria de acciones hechas por IA

### Fase 4: Alertas y automatizacion ligera

- recordatorios internos
- recurrentes
- duplicar movimientos
- importacion CSV
- notificaciones email/push si hace falta
- resumen diario/semanal
- integracion futura con WhatsApp o Telegram

### Fase 5: Analisis avanzado

- tendencias
- comparativos mensuales
- rentabilidad por unidad
- escenarios
- recomendaciones

## Primeros comandos propuestos

Cuando empecemos a construir:

```powershell
git init
npx create-next-app@latest . --yes --force --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --use-npm
npx shadcn@latest init
npm install recharts react-hook-form zod @hookform/resolvers zustand lucide-react date-fns clsx tailwind-merge
```

Despues:

```powershell
npm run dev
npm run build
```

## Dudas que necesitamos cerrar antes de programar mucho

1. Nombre final confirmado: **Arca**.
2. Moneda: solo COP desde v1?
3. Uso real: vas a usarla tu solo o alguien mas podria entrar despues?
4. Privacidad: quieres login desde el primer deploy o aceptas prototipo local sin cuenta?
5. Persistencia: quieres arrancar rapido local y migrar a Supabase, o prefieres Supabase desde el primer sprint para habilitar MCP antes?
6. Alertas: basta con alertas dentro de la app al inicio, o necesitas email/push/WhatsApp?
7. Saldo inicial: tienes saldos reales por cuenta para cargar o usamos mock mientras tanto?
8. Deudas/tarjetas: quieres registrar pagos minimos o cuotas exactas por compra?
9. Proyeccion: la quieres por mes calendario o por quincenas?
10. Github: creamos repo privado en GitHub para conectar Netlify?
11. IA/MCP: quieres que registre directo cuando este segura o que siempre pida confirmacion antes de guardar?
12. Cuenta por defecto: Nequi sera cuenta habitual para gastos pequenos como almuerzo/transporte?

## Recomendacion final para arrancar

Arrancar con:

- nombre: **Arca**
- Next.js + TypeScript + Tailwind + shadcn/ui
- mock data realista
- persistencia local encapsulada
- Netlify como hosting de prueba
- GitHub privado como repo remoto
- arquitectura lista para Supabase, API interna y MCP

Si queremos solo validar UI: no meter Supabase en el primer commit.

Si queremos que la IA/MCP opere datos reales desde fuera de la app temprano, Supabase debe entrar antes, porque `localStorage` no sirve para que una IA externa consulte y modifique la misma fuente de datos.
