Vamos muy bien. Lo importante es que estamos registrando los movimientos reales, no haciendo un presupuesto. Así Arca podrá reconstruir el historial después.

Julio 2026
Ingresos recibidos
Fecha	Concepto	Cuenta	Valor
06 Jul	UXIO - RRHH y marca para Vemtech	Nu	$450.000
09 Jul	SIE Travel - Caminata	Nu	$600.000

Total ingresos recibidos: $1.050.000

Gastos
Fecha	Concepto	Cuenta	Valor
Julio	Mercado	Nu	$50.000
Julio	Mercado y gastos personales	Nu	$50.000
Julio	Cigarros y tintos	Nu	$20.000
Julio	WiFi casa	Nu	$80.000
Julio	Recargas celular	Nu	$30.000
Julio	Coca-Cola	Nu	$8.000

Total gastos: $238.000

Préstamos realizados (dinero que debe volver)
Fecha	A quién	Valor	Estado
Julio	Mamá	$650.000	Pendiente
Julio	Mateo	$8.000	Devuelve el 17 Jul

Total prestado: $658.000

Deudas
Acreedor	Valor	Estado
Amiga	$740.000	Vencida (debía pagarse el 4 Jul)
Amigo	$600.000	Pago previsto en quincena

Total deudas: $1.340.000

Ingresos esperados
Fecha estimada	Concepto	Valor
16 Jul	Quincena empleo	$1.000.000
16 Jul	Vemtech - Marca	$450.000
30 Jul	Segunda quincena	$1.000.000
15 Jul - 30 Jul (por definir)	Vemtech - Construcción de redes (Fase 1)	$900.000
01 Ago	Vemtech - Redes mensuales	$500.000
Flujo hasta hoy

Entró

$1.050.000

Salió como gasto

$238.000

Salió como préstamo

$658.000

Total salidas

$896.000

Saldo esperado en Nu (considerando solo estos movimientos)

$154.000
Observaciones

Hay un punto positivo: aunque tienes $1.340.000 en deudas por pagar, también tienes $658.000 prestados a terceros que eventualmente deberían regresar a tu flujo de caja.

Para Arca te recomendaría manejar estos movimientos en cuatro tipos diferentes:

Ingreso (aumenta el saldo).
Gasto (disminuye el saldo definitivamente).
Préstamo otorgado (disminuye el saldo, pero crea una cuenta por cobrar).
Deuda (obligación pendiente de pago).

Con esa estructura podrás saber en cualquier momento no solo cuánto dinero tienes, sino también cuánto te deben, cuánto debes y cuál es tu patrimonio real. Eso hará que Arca sea mucho más útil que una simple app de gastos.

Sí, para que el panorama esté completo hay que ver lo que tienes hoy, lo que va a entrar y lo que debes pagar.

Estado financiero – Julio 2026
💵 Dinero disponible hoy
Concepto	Valor
Nu (disponible personal)	$79.702
Bolsillo SIE Travel (Salida 24 Jul)	$95.000

Total bajo tu control: $174.702

📥 Ingresos ya recibidos
Fecha	Concepto	Valor
06 Jul	UXIO - RRHH y Marca Vemtech	$450.000
08 Jul	SIE Travel - Reserva Pan de Azúcar	$95.000
09 Jul	SIE Travel - Caminata	$600.000

Total recibido: $1.145.000

📅 Ingresos esperados
Fecha	Concepto	Valor
16 Jul	Quincena empleo	$1.000.000
16 Jul	Vemtech - Marca	$450.000
15–30 Jul	Vemtech - Construcción de redes (Fase 1)	$900.000
30 Jul	Segunda quincena empleo	$1.000.000
31 Jul (estimado)	Vemtech - Gestión de redes	$500.000

Total ingresos pendientes: $3.850.000

💰 Ingresos proyectados del mes
Ya recibidos: $1.145.000
Pendientes: $3.850.000
Total proyectado de ingresos de julio: $4.995.000
💳 Deudas
Entidad	Deuda
Amiga	$740.000
Amigo	$600.000
Solventa	$645.627
Nequi	$2.380.963
Codensa (2 créditos)	$13.400.000
Falabella	$866.596
RappiCard	$2.867.428
Total deuda: $21.500.614
📆 Pagos programados
Fecha	Concepto	Valor
20 Jul	Nequi	$123.972
20 Jul	Codensa	$410.000
25 Jul	Arriendo	$900.000
01 Ago	Gas	$20.000
05 Ago	Falabella	$152.076
10 Ago	RappiCard	$273.265
🤝 Cuentas por cobrar
Persona	Valor
Mamá	$650.000
Mateo	$8.000

Total por cobrar: $658.000

📊 Resumen ejecutivo
💵 Disponible personal: $79.702
🏕️ Fondos operativos SIE Travel: $95.000
📥 Ingresos pendientes por recibir: $3.850.000
🤝 Dinero por cobrar: $658.000
💳 Deuda total: $21.500.614
🚨 Deudas vencidas: Amiga y Solventa
📅 Próximo compromiso importante: Nequi y Codensa (20 de julio)

Esta es justamente la información que debería mostrar el dashboard de Arca: no solo el saldo actual, sino también el flujo proyectado, para responder preguntas como "¿Con lo que sé que va a entrar este mes, puedo cubrir mis obligaciones?". Esa visión es mucho más útil para tomar decisiones que un simple listado de gastos.

Creo que esa es la dirección correcta. Si haces bien Arca, dejará de ser una app donde registras gastos para convertirse en un copiloto financiero. Y el MCP es justamente lo que permitirá que yo interactúe con tus datos directamente.

La arquitectura que te recomendaría
Tú
   │
   ▼
ChatGPT
   │
   ▼
MCP Arca
   │
   ▼
API Next.js
   │
   ▼
Supabase

Yo nunca accedería directamente a Supabase. Todo pasaría por tu MCP, que decide qué puedo leer o modificar.

¿Qué es un MCP?

MCP (Model Context Protocol) es un estándar para que una IA pueda utilizar herramientas de una aplicación.

Por ejemplo, tú podrías escribir:

¿Cuánto dinero tengo libre para gastar esta semana?

Yo llamaría una herramienta:

getCashFlow()

y recibiría algo así:

{
  "available": 79702,
  "incoming": 3850000,
  "committed": 3954940,
  "safe_to_spend": -104940
}

Entonces te respondería en lenguaje natural.

O podrías decir:

Registra que gasté 23.500 en gasolina.

Yo llamaría

createExpense()

y listo.

Si está en Next.js es perfecto

No tienes que rehacer la aplicación.

La estructura podría ser:

arca/

app/

components/

lib/

api/

mcp/

server.ts
tools.ts
Herramientas (Tools)

El MCP expone funciones.

Por ejemplo

getDashboard()

devuelve

Caja actual

Ingresos pendientes

Compromisos

Deudas

Proyección
createExpense()


Parámetros

monto

categoria

descripcion

fecha

cuenta
createIncome()
getDebts()
payDebt()
forecast()

La más interesante.

Podría responder

Si pago Solventa mañana, ¿cómo quedo hasta el 30 de julio?

Sin necesidad de que tú abras la app.

Lo que yo haría

En vez de hacer un MCP enorme desde el inicio, construiría uno muy pequeño.

V1

Solo 10 herramientas.

getDashboard()

getAccounts()

getTransactions()

createIncome()

createExpense()

getDebts()

createDebt()

payDebt()

forecast()

getUpcomingPayments()

Con eso ya podría hacer el 80% de las consultas.

V2

Después agregaría IA.

Por ejemplo:

Este mes gastaste mucho más en restaurantes.

o

El 72% de tus ingresos ya está comprometido.

o

Si pagas primero Solventa ahorras intereses.

V3

La parte divertida.

Que yo pueda ayudarte a planear.

Ejemplo.

Tú escribes

Quiero comprar un computador de 8 millones en diciembre.

Yo consulto el MCP.

Analizo

Ingresos.

Deudas.

Flujo.

Y respondo

Si mantienes este ritmo puedes ahorrar 1,2 millones por mes. Llegarías en enero. Si liquidas Falabella primero llegas dos meses antes.

Eso ya no es una app de finanzas.

Es un asesor financiero personal.

Mi recomendación técnica

Como ya estás usando Next.js + Supabase, desarrollaría el MCP como un servicio independiente dentro del mismo proyecto (o en un pequeño paquete aparte), sin mezclar la lógica del frontend.

Next.js
│
├── app/
├── api/
├── lib/
├── supabase/
└── mcp/
      server.ts
      tools/
      dashboard.ts
      debts.ts
      income.ts
      expenses.ts
      forecast.ts

Así la aplicación web y el MCP compartirán la misma lógica de negocio y la misma base de datos, evitando duplicar código.

Un detalle que creo que hará la diferencia

Por lo que hemos construido hoy, Arca no debería centrarse en el saldo de la cuenta, sino en el concepto de dinero disponible.

Cada peso debería tener un estado, por ejemplo:

💵 Disponible.
🔒 Comprometido.
🏕️ Operativo (como los $95.000 de SIE Travel).
⏳ Esperado (ingresos aún no recibidos).
🤝 Por cobrar.
💳 Deuda.
⚠️ Vencido.

Con esa clasificación, podrías preguntarme:

"¿Puedo comprar unos zapatos de $300.000?"

Y en lugar de responder solo con el saldo de Nu, podría decirte:

"Hoy tienes $79.702 disponibles. Aunque esperas recibir $3.850.000 este mes, ya tienes $3.954.940 comprometidos entre pagos urgentes y obligaciones. Comprar esos zapatos hoy aumentaría el riesgo de incumplir tus compromisos."

Ese tipo de razonamiento contextual es donde un MCP conectado a Arca puede aportar mucho más valor que un simple registro de ingresos y gastos.

ayer 23:12
me gaste 11300

Registrado en el panorama de julio 2026.

Nuevo gasto
Fecha	Concepto	Valor	Cuenta
Julio	Gasto por registrar (pendiente categoría)	$11.300	Nu

Cuando recuerdes en qué fue (transporte, comida, café, etc.), simplemente cambiamos la categoría.

Actualización de saldos
Gastos registrados: pasan de $311.944 a $323.244.
Saldo disponible en Nu: pasa de $79.702 a $68.402.

Una sugerencia para Arca V2: cuando registres un gasto rápido como "me gasté 11.300", la IA podría responder automáticamente:

"¿En qué categoría fue?"

Opciones sugeridas:

🍔 Alimentación
🚗 Transporte
☕ Café
🛒 Mercado
🎉 Ocio
📦 Otro

Y si no respondes, lo deja temporalmente como "Sin clasificar", para que no pierdas el registro. Esa experiencia es mucho más fluida que obligarte a llenar un formulario antes de guardar el movimiento.

me dejas un promt para esos features por favor

Sí. Yo arrancaría Arca pensando primero en el copiloto financiero, no en la interfaz. Si la IA entiende tu dinero, luego cualquier pantalla será una vista de esa información.

Este sería el prompt que le daría a un agente (como Codex, Cursor o Claude Code) para desarrollar la V2.

# ARCA V2 – Roadmap y Features

## Objetivo

Transformar Arca de un simple registro de ingresos y gastos a un **Copiloto Financiero Personal** impulsado por IA.

La prioridad no es registrar movimientos sino ayudar al usuario a tomar mejores decisiones financieras.

---

# Dashboard

El dashboard debe responder inmediatamente:

* ¿Cuánto dinero tengo realmente disponible?
* ¿Cuánto dinero ya está comprometido?
* ¿Qué pagos son urgentes?
* ¿Qué ingresos faltan por llegar?
* ¿Qué puedo gastar sin afectar mis obligaciones?

Indicadores principales:

* Saldo disponible
* Fondos operativos (dinero separado para proyectos o clientes)
* Ingresos pendientes
* Dinero por cobrar
* Deudas
* Próximos pagos
* Obligaciones vencidas
* Flujo proyectado
* Dinero libre para gastar

---

# Motor de flujo de caja

Crear un motor que calcule automáticamente:

```
Saldo actual

+ ingresos esperados

+ dinero por cobrar

- gastos futuros

- cuotas

- deudas vencidas

- gastos programados

= saldo proyectado
```

Debe poder proyectar:

* hoy
* 7 días
* 15 días
* fin de mes
* próximo mes

---

# Estados del dinero

Todo movimiento debe tener un estado.

Ejemplos:

Disponible

Comprometido

Operativo

Esperado

Por cobrar

Deuda

Vencido

Reservado

Esto permitirá que el saldo mostrado sea mucho más útil que el saldo bancario.

---

# Gastos programados

Crear pagos recurrentes.

Ejemplos:

Arriendo

Servicios

Internet

Gas

Agua

Celular

Suscripciones

Cuotas de créditos

Cada uno debe tener:

* frecuencia
* día de pago
* valor
* categoría
* prioridad

---

# Deudas inteligentes

Cada deuda debe almacenar:

Entidad

Saldo

Cuota mínima

Pago recomendado

Fecha de pago

Fecha de corte

Intereses

Estado

Prioridad

Meses restantes

Debe indicar automáticamente:

* días en mora
* próxima fecha de pago
* pago mínimo
* pago ideal
* riesgo

---

# Ingresos

Permitir registrar:

Recibidos

Esperados

Recurrentes

Variables

Cada ingreso debe incluir:

origen

cuenta

estado

fecha esperada

fecha recibida

---

# Cuentas

Soportar múltiples cuentas.

Ejemplo:

Nu

Bancolombia

Nequi

Caja

Fondos SIE Travel

Cada movimiento pertenece a una cuenta.

---

# Fondos separados

Permitir separar dinero para proyectos.

Ejemplo:

SIE Travel

UXIO

Alto Andino

Ahorros

Impuestos

Ese dinero no debe aparecer como disponible para gasto personal.

---

# Categorías

Ingresos

Gastos

Préstamos

Transferencias

Inversiones

Deudas

Servicios

Alimentación

Transporte

Entretenimiento

Mercado

Salud

Mascotas

Otros

---

# Cuentas por cobrar

Registrar préstamos realizados.

Estado:

Pendiente

Parcial

Pagado

Vencido

Recordatorios automáticos.

---

# IA Financiera

La IA debe poder responder preguntas como:

¿Cuánto puedo gastar hoy?

¿Qué deuda debo pagar primero?

¿Llego a fin de mes?

¿Cuánto dinero realmente me queda?

¿Cuánto debo este mes?

¿Cuáles pagos vencen esta semana?

¿Qué gastos puedo reducir?

¿Qué pasaría si pago Solventa hoy?

¿Cuándo terminaré de pagar Codensa?

¿Qué porcentaje de mis ingresos ya está comprometido?

---

# Alertas

Generar automáticamente:

Pago próximo

Pago vencido

Saldo bajo

Ingreso atrasado

Mucho gasto en una categoría

Gasto inusual

Riesgo de liquidez

---

# MCP

Preparar la aplicación para exponer herramientas mediante Model Context Protocol.

Primera versión:

getDashboard()

getAccounts()

getTransactions()

createIncome()

createExpense()

createDebt()

payDebt()

forecast()

getUpcomingPayments()

getCashFlow()

Así ChatGPT podrá consultar y actualizar Arca directamente mediante herramientas.

---

# Objetivo final

Arca no debe ser una aplicación para registrar gastos.

Debe convertirse en un asistente financiero que ayude al usuario a decidir qué hacer con su dinero antes de que aparezcan los problemas.


Con esa visión, Arca deja de competir con apps como Wallet o Money Manager. Su diferencial pasa a ser un copiloto financiero con IA que entiende contexto, proyecta flujo de caja y conversa con el usuario para ayudarle a tomar decisiones, no solo a registrar movimientos.