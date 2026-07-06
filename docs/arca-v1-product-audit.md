# Arca V1 Product Audit

## Resumen ejecutivo

Arca es un sistema de control financiero personal-operativo centrado en caja, obligaciones, crédito y decisiones del mes. Su valor no está en contabilidad formal ni en presupuesto rígido, sino en unir:

- dinero disponible real
- pagos y vencimientos
- deudas y tarjetas
- ahorro protegido
- flujo por unidades de negocio

La base técnica actual ya soporta:

- autenticación con Google
- workspace por usuario
- tenancy con `workspace_id`
- shell SaaS con rutas reales
- lectura operativa desde Supabase

La oportunidad de v1 está en cerrar mejor la jerarquía del producto y dejar cada pestaña con un propósito claro, sin mezclar lectura ejecutiva con captura operativa.

## Qué hace la app hoy

Arca permite:

- entrar con Google y crear un workspace personal
- cargar cuentas, deudas, tarjetas, movimientos, metas y eventos
- ver caja disponible y pagos urgentes
- registrar movimientos manuales y transferencias
- revisar cuentas, ahorro, historial, negocios, obligaciones y planeación

Modelo conceptual actual:

- `Dashboard`: vista ejecutiva
- `Hoy`: foco táctico del día
- `Registrar`: captura manual
- `Transferir`: movimiento entre cuentas
- `Cuentas`: dónde vive la caja
- `Obligaciones`: pagos y compromisos
- `Tarjetas`: crédito rotativo
- `Ahorro`: bolsillos y metas
- `Historial`: auditoría operativa
- `Mes`: planeación mensual
- `Calendario`: agenda financiera
- `Proyección`: escenarios y supuestos
- `Negocios`: flujo por unidad
- `Configuración`: usuario, workspace y plan

Relación entre módulos:

1. `Registrar` y `Transferir` alimentan el sistema.
2. `Cuentas` refleja dónde está el dinero y cómo cambia.
3. `Obligaciones` y `Tarjetas` generan presión de caja.
4. `Hoy` usa cuentas + eventos + ingresos esperados para sugerir decisiones.
5. `Dashboard` resume el estado general.
6. `Mes`, `Calendario` y `Proyección` ayudan a planear.
7. `Negocios` separa el flujo por unidad económica.

## Auditoría por pestaña

### Dashboard

Rol correcto:

- solo métricas y gráficas
- sin formularios
- sin listas largas
- sin detalle operativo profundo

Preguntas que debe responder:

- cuánto dinero tengo hoy
- cuánto entra este mes
- cuánto sale este mes
- cuánto queda libre
- cuánto debo en total
- cómo viene la tendencia del flujo
- qué porcentaje de caja está comprometido

Contenido ideal:

- KPIs superiores
- 2 a 4 gráficas máximas
- mini resumen de riesgo
- accesos a `Hoy`, `Registrar`, `Obligaciones`

Observación:

- debe ser el panel ejecutivo principal
- no debe competir con `Hoy`

### Hoy

Rol correcto:

- tablero táctico del día
- urgencias, pagos sugeridos, caja inmediata y siguiente ingreso

Lo mejor actual:

- es la pantalla con mejor dirección visual
- ya comunica prioridad y riesgo de forma clara

Qué mejorar:

1. ordenar jerarquía:
   - vencidos
   - pagos posibles hoy
   - siguiente ingreso
   - caja libre inmediata
   - alertas
2. eliminar ruido repetido
3. hacer más accionables algunos bloques

### Registrar

Rol correcto:

- puerta de entrada de la operación manual

Debe cubrir:

- ingreso
- gasto
- deuda
- tarjeta
- cuenta
- ahorro/meta
- pago programado

Recomendación:

- dividir en tabs o segmentos
- no usar un formulario larguísimo

### Transferir

Rol correcto:

- mover caja entre cuentas

Debe mostrar:

- origen
- destino
- monto
- motivo
- saldo antes y después

Recomendación:

- vista simple
- sin gráficas

### Cuentas

Rol correcto:

- mostrar dónde vive la caja

Debe mostrar:

- saldo
- tipo
- rol de la cuenta
- liquidez disponible
- si se usa como fuente sugerida de pago

Recomendación:

- formato wallet o stack
- identidad visual por cuenta
- no solo “tarjetas bonitas”; debe decir para qué sirve cada cuenta

### Obligaciones

Rol correcto:

- unir deudas, servicios, arriendo y pagos recurrentes

Debe mostrar:

- prioridad
- fecha
- monto
- atraso
- cuenta sugerida
- impacto en caja

Recomendación:

- filtros por vencido, semana, mes, tipo
- debe ser una vista operativa fuerte

### Tarjetas

Rol correcto:

- módulo especializado de crédito rotativo

Debe mostrar:

- cupo total
- usado
- disponible
- porcentaje de uso
- pago mínimo
- pago total
- fecha de corte
- fecha límite
- tasa / interés
- estrategia de pago

Dirección visual recomendada:

- estilo tipo wallet, inspirado en Google Wallet
- lectura clara, sobria y premium

Render recomendado para v1:

- nombre + issuer
- usado / cupo
- porcentaje de uso
- mínimo
- fecha límite

Detalle expandido:

- fecha de corte
- tasa
- interés
- pago total estimado
- historial de pagos
- estrategia de pago

Recomendación de color:

1. mapping por issuer si existe:
   - Nu
   - Rappi
   - Falabella
   - Codensa/Enel
2. color manual por usuario si quiere personalizar
3. fallback estable por hash del nombre

Campos recomendados a futuro:

- `brand_color`
- `text_color`
- `card_style`

### Ahorro

Rol correcto:

- separar dinero protegido del dinero libre

Debe mostrar:

- bolsillos
- metas
- avance
- propósito
- si cuenta o no como caja libre

Recomendación:

- diferenciar `bolsillo` de `meta`

### Historial

Rol correcto:

- auditoría operativa

Debe mostrar:

- fecha
- concepto
- tipo
- cuenta
- categoría
- unidad
- monto
- estado

Recomendación:

- tabla fuerte
- filtros por mes, cuenta, unidad, tipo y estado

### Mes

Rol correcto:

- planeación mensual

Debe mostrar:

- entradas esperadas
- salidas esperadas
- cronología
- resultado esperado
- presión por semana o quincena

Recomendación:

- menos narrativa
- más estructura temporal
- no debe parecer “Dashboard 2”

### Calendario

Rol correcto:

- agenda financiera real

Debe mostrar:

- cuadrícula mensual
- eventos por día
- ingresos
- pagos
- vencimientos
- alertas

Recomendación:

- evolucionar de lista a calendario real

### Proyección

Rol correcto:

- visión de mediano plazo

Debe mostrar:

- escenarios
- supuestos
- cierre estimado
- evolución de caja
- deuda y ahorro a futuro

Recomendación:

- debe ser diferente de `Mes`
- `Mes` = operativo
- `Proyección` = hipótesis y futuro

### Negocios

Rol correcto:

- separar personal vs unidades de negocio

Debe mostrar:

- cobrado
- por cobrar
- gastos
- neto
- próximo evento

Recomendación:

- mini P&L operativo por unidad

### Configuración

Rol correcto:

- identidad del workspace y reglas base

Debe mostrar:

- usuario
- workspace
- plan
- moneda
- timezone
- preferencias visuales
- reglas futuras

## Definición de producto para un consultor

Arca debe explicarse así:

**Arca es un sistema de control de caja personal-operativa que combina ejecución diaria, planeación mensual y control de deuda/crédito en una sola herramienta.**

No es:

- una contabilidad formal
- un ERP
- una app de presupuesto rígido

Sí es:

- un cockpit de decisiones financieras
- un sistema de lectura de caja
- una capa operativa entre cuentas, deudas, tarjetas, servicios y negocios

## Recomendaciones para cerrar v1

Orden de prioridad:

1. `Dashboard` solo KPIs + charts
2. `Hoy` mejor ordenado
3. `Registrar` modular
4. `Obligaciones` fuerte
5. `Tarjetas` tipo wallet con data crediticia clara
6. `Cuentas` con roles de caja
7. `Historial` filtrable
8. `Mes` y `Calendario` mejor diferenciados
9. `Proyección` como capa de escenarios
10. `Negocios` más ejecutivo

## Recomendaciones UX específicas para tarjetas

La mejor dirección para tarjetas es:

- visualmente memorables
- informativamente densas
- máximo 3 capas visibles
- detalle extra en modal o panel expandido

Cara visible:

- nombre
- issuer
- usado / cupo
- porcentaje de uso
- mínimo
- fecha límite

Detalle:

- corte
- tasa
- total estimado
- estrategia
- pagos anteriores

Conclusión:

Para v1 conviene adoptar tarjetas tipo wallet, pero con sobriedad y prioridad total a la lectura financiera antes que al adorno visual.
