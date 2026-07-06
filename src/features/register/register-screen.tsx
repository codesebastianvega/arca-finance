import Link from "next/link";
import { ArrowRightLeft, BadgeDollarSign, CreditCard, Landmark, PiggyBank, Plus, Repeat, Wallet } from "lucide-react";
import { createAccount, createCreditCard, createDebt, createExpenseTemplate, createIncomeTemplate, createSavingsGoal, createTransaction } from "@/app/actions";
import { Button, Card } from "@/components/ui-kit";
import { creditCardIssuerOptions } from "@/lib/card-issuers";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCOP } from "@/lib/finance";
import { AccountFormFields } from "./account-form-fields";

const fieldClass = "arca-focus arca-input text-sm";
const areaClass = `${fieldClass} arca-input-area`;
const labelClass = "text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]";
const dateFieldProps = { lang: "es-CO", inputMode: "numeric" as const };

const segments = [
  { key: "movimiento", label: "Movimiento", icon: Wallet },
  { key: "plantilla_ingreso", label: "Ingreso programado", icon: Repeat },
  { key: "plantilla_gasto", label: "Gasto programado", icon: Repeat },
  { key: "cuenta", label: "Cuenta", icon: Landmark },
  { key: "deuda", label: "Deuda", icon: BadgeDollarSign },
  { key: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { key: "ahorro", label: "Ahorro", icon: PiggyBank },
] as const;

type SegmentKey = (typeof segments)[number]["key"];

export function RegisterScreen({
  data,
  activeSegment = "movimiento",
  welcome = false,
}: {
  data: DashboardData;
  activeSegment?: string;
  welcome?: boolean;
}) {
  const segment = segments.some((item) => item.key === activeSegment) ? (activeSegment as SegmentKey) : "movimiento";
  const businessOptions = data.business;
  const incomeSourceOptions = data.incomeSources;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--elevation-strong)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Registrar</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
              Captura manual sin mezclar todo en un solo formulario.
            </h1>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Cada bloque registra algo distinto: caja, deudas, tarjetas o ahorro real.
            </p>
          </div>
          <Link href="/app/transferir">
            <Button size="sm" variant="secondary">
              <ArrowRightLeft size={16} />
              Ir a transferir
            </Button>
          </Link>
        </div>
      </section>

      {welcome ? (
        <Card className="p-4">
          <p className="text-sm text-[var(--foreground)]">
            Bien. Ya tienes tu espacio listo. Ahora registra primero la base que elegiste y desde ahi Arca empieza a darte lectura real.
          </p>
        </Card>
      ) : null}

      <section className="flex flex-wrap gap-2">
        {segments.map((item) => {
          const Icon = item.icon;
          const active = item.key === segment;

          return (
            <Link
              key={item.key}
              href={`/app/registrar?segment=${item.key}`}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${active ? "arca-chip-active" : "arca-chip"}`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <Card className="p-5 md:p-6">
          {segment === "movimiento" ? <MovementForm data={data} businessOptions={businessOptions} incomeSourceOptions={incomeSourceOptions} /> : null}
          {segment === "plantilla_ingreso" ? <IncomeTemplateForm data={data} businessOptions={businessOptions} incomeSourceOptions={incomeSourceOptions} /> : null}
          {segment === "plantilla_gasto" ? <ExpenseTemplateForm data={data} businessOptions={businessOptions} /> : null}
          {segment === "cuenta" ? <AccountForm /> : null}
          {segment === "deuda" ? <DebtForm /> : null}
          {segment === "tarjeta" ? <CardForm /> : null}
          {segment === "ahorro" ? <SavingsForm /> : null}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Contexto</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Cuentas disponibles</h2>
            <div className="mt-4 space-y-3">
              {data.accounts.length ? (
                data.accounts
                  .sort((a, b) => b.balance - a.balance)
                  .slice(0, 5)
                  .map((account) => (
                    <div key={account.id} className="arca-soft-block rounded-2xl px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{account.name}</p>
                          <p className="text-sm text-[var(--muted)]">{account.type}</p>
                        </div>
                        <p className="font-semibold text-[var(--foreground)]">{formatCOP(account.balance)}</p>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="arca-muted-block rounded-2xl p-4 text-sm text-[var(--muted)]">
                  Aun no hay cuentas. Empieza por crear una cuenta o billetera.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Reglas</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
              <p>Los movimientos pagados o confirmados afectan caja real.</p>
              <p>Las plantillas generan agenda esperada para este mes y los dos siguientes.</p>
              <p>Crear una deuda o tarjeta deja su siguiente pago listo para seguimiento.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MovementForm({
  data,
  businessOptions,
  incomeSourceOptions,
}: {
  data: DashboardData;
  businessOptions: Array<{ id: string; name: string }>;
  incomeSourceOptions: DashboardData["incomeSources"];
}) {
  if (!data.accounts.length) {
    return <RegisterDependencyState title="Primero crea una cuenta" description="Sin una cuenta o billetera no se puede registrar dinero real." href="/app/registrar?segment=cuenta" cta="Crear cuenta" />;
  }

  if (!businessOptions.length) {
    return <RegisterDependencyState title="Primero crea un frente" description="Cada movimiento debe quedar ligado a un frente economico real. Ya no usamos Personal como relleno silencioso." href="/app/negocios#new-unit" cta="Crear frente" />;
  }

  return (
    <div>
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Movimiento</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Ingreso, gasto o pago programado</h2>
      </div>
      <form action={createTransaction} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClass}>Tipo</span>
          <select name="kind" className={fieldClass} defaultValue="expense" required>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="debt_payment">Pago deuda</option>
            <option value="card_payment">Pago tarjeta</option>
            <option value="saving_contribution">Aporte ahorro</option>
            <option value="saving_withdrawal">Retiro ahorro</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Estado</span>
          <select name="status" className={fieldClass} defaultValue="paid" required>
            <option value="paid">Confirmado ahora</option>
            <option value="scheduled">Programado</option>
            <option value="overdue">Vencido</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <p className="text-xs leading-5 text-[var(--muted)]">
            Confirmado entra a caja real. Programado solo vive en agenda.
          </p>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Valor</span>
          <input name="amount" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Cuenta o efectivo</span>
          <select name="accountId" className={fieldClass} required>
            {data.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} - {formatCOP(account.balance)}
              </option>
            ))}
          </select>
          <p className="text-xs leading-5 text-[var(--muted)]">Esta es la cuenta donde entró o salió la plata. Si fue en efectivo, usa tu cuenta de efectivo.</p>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className={labelClass}>Concepto</span>
          <input name="concept" className={fieldClass} placeholder="Almuerzo, pago cliente, cuota..." required />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className={labelClass}>Fuente de ingreso</span>
          <input type="hidden" name="sourceType" value="income_source" />
          <select name="sourceId" className={fieldClass} defaultValue="">
            <option value="">Sin ligar</option>
            {incomeSourceOptions.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name} {"->"} {source.businessUnitKey}
              </option>
            ))}
          </select>
          <p className="text-xs leading-5 text-[var(--muted)]">
            Úsala cuando el movimiento sea un ingreso. Si la eliges, Arca liga el ingreso a esa fuente y toma su frente/unidad automáticamente.
          </p>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Categoria</span>
          <input name="category" className={fieldClass} defaultValue="General" required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Frente o unidad</span>
          <select name="unit" className={fieldClass} defaultValue={businessOptions[0]?.id} required>
            {businessOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          <p className="text-xs leading-5 text-[var(--muted)]">Si escoges una fuente de ingreso arriba, este valor se reemplaza por la unidad asociada a esa fuente.</p>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Fecha</span>
          <input name="date" type="date" className={fieldClass} defaultValue={getToday()} required {...dateFieldProps} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Vencimiento</span>
          <input name="dueDate" type="date" className={fieldClass} {...dateFieldProps} />
        </label>
        <div className="md:col-span-2">
          <Button type="submit" size="lg">
            <Plus size={16} />
            Guardar movimiento
          </Button>
        </div>
      </form>
    </div>
  );
}

function IncomeTemplateForm({
  data,
  businessOptions,
  incomeSourceOptions,
}: {
  data: DashboardData;
  businessOptions: Array<{ id: string; name: string }>;
  incomeSourceOptions: DashboardData["incomeSources"];
}) {
  if (!data.accounts.length || !businessOptions.length || !incomeSourceOptions.length) {
    return (
      <RegisterDependencyState
        title="Falta base para esta plantilla"
        description="Para proyectar ingresos necesitas una cuenta destino, un frente y una fuente de ingreso ya creados."
        href={!businessOptions.length ? "/app/negocios#new-unit" : !incomeSourceOptions.length ? "/app/negocios#new-source" : "/app/registrar?segment=cuenta"}
        cta={!businessOptions.length ? "Crear frente" : !incomeSourceOptions.length ? "Crear fuente" : "Crear cuenta"}
      />
    );
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Plantilla de ingreso</p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Entrada recurrente o por periodo</h2>
      <form action={createIncomeTemplate} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className={labelClass}>Nombre visible</span>
          <input name="name" className={fieldClass} placeholder="Quincena, contrato mensual, pago por servicio..." required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Fuente de ingreso</span>
          <select name="incomeSourceId" className={fieldClass} required>
            {incomeSourceOptions.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name} {"->"} {source.businessUnitKey}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Frente o unidad</span>
          <select name="businessUnitKey" className={fieldClass} defaultValue={businessOptions[0]?.id} required>
            {businessOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Cuenta destino</span>
          <select name="defaultAccountId" className={fieldClass} required>
            {data.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} - {formatCOP(account.balance)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Monto esperado</span>
          <input name="defaultAmount" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Frecuencia</span>
          <select name="frequency" className={fieldClass} defaultValue="monthly">
            <option value="monthly">Mensual</option>
            <option value="biweekly">Quincenal</option>
            <option value="weekly">Semanal</option>
            <option value="bimonthly">Bimestral</option>
            <option value="custom_days_of_month">Dias del mes</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Dias del mes</span>
          <input name="daysOfMonth" className={fieldClass} placeholder="15,30" />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Modo</span>
          <select name="recurrenceMode" className={fieldClass} defaultValue="open_recurring">
            <option value="open_recurring">Indefinido</option>
            <option value="date_bounded">Con fecha fin</option>
            <option value="occurrence_bounded">Por numero de veces</option>
            <option value="manual_variable">Variable manual</option>
            <option value="one_time">Una sola vez</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Inicio</span>
          <input name="startDate" type="date" className={fieldClass} defaultValue={getToday()} required {...dateFieldProps} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Fecha fin</span>
          <input name="endDate" type="date" className={fieldClass} {...dateFieldProps} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Numero de veces</span>
          <input name="occurrenceLimit" type="number" min="1" className={fieldClass} />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className={labelClass}>Notas</span>
          <textarea name="notes" className={areaClass} />
        </label>
        <div className="md:col-span-2">
          <Button type="submit" size="lg">
            <Plus size={16} />
            Guardar plantilla de ingreso
          </Button>
        </div>
      </form>
    </div>
  );
}

function ExpenseTemplateForm({
  data,
  businessOptions,
}: {
  data: DashboardData;
  businessOptions: Array<{ id: string; name: string }>;
}) {
  if (!data.accounts.length || !businessOptions.length) {
    return (
      <RegisterDependencyState
        title="Falta base para esta plantilla"
        description="Para programar gastos o pagos necesitas al menos una cuenta y un frente economico."
        href={!businessOptions.length ? "/app/negocios#new-unit" : "/app/registrar?segment=cuenta"}
        cta={!businessOptions.length ? "Crear frente" : "Crear cuenta"}
      />
    );
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Plantilla de gasto</p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Pago u obligacion recurrente</h2>
      <form action={createExpenseTemplate} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className={labelClass}>Nombre visible</span>
          <input name="name" className={fieldClass} placeholder="Arriendo, internet, cuota, ahorro programado..." required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Tipo</span>
          <select name="kind" className={fieldClass} defaultValue="expense">
            <option value="expense">Gasto</option>
            <option value="saving">Ahorro</option>
            <option value="debt_payment">Pago deuda</option>
            <option value="card_payment">Pago tarjeta</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Frente o unidad</span>
          <select name="businessUnitKey" className={fieldClass} defaultValue={businessOptions[0]?.id} required>
            {businessOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Cuenta sugerida</span>
          <select name="defaultAccountId" className={fieldClass} required>
            {data.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} - {formatCOP(account.balance)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Monto esperado</span>
          <input name="defaultAmount" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Frecuencia</span>
          <select name="frequency" className={fieldClass} defaultValue="monthly">
            <option value="monthly">Mensual</option>
            <option value="biweekly">Quincenal</option>
            <option value="weekly">Semanal</option>
            <option value="bimonthly">Bimestral</option>
            <option value="custom_days_of_month">Dias del mes</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Dias del mes</span>
          <input name="daysOfMonth" className={fieldClass} placeholder="5,20,25" />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Modo</span>
          <select name="recurrenceMode" className={fieldClass} defaultValue="open_recurring">
            <option value="open_recurring">Indefinido</option>
            <option value="date_bounded">Con fecha fin</option>
            <option value="occurrence_bounded">Por numero de veces</option>
            <option value="manual_variable">Variable manual</option>
            <option value="one_time">Una sola vez</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Inicio</span>
          <input name="startDate" type="date" className={fieldClass} defaultValue={getToday()} required {...dateFieldProps} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Fecha fin</span>
          <input name="endDate" type="date" className={fieldClass} {...dateFieldProps} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Numero de veces</span>
          <input name="occurrenceLimit" type="number" min="1" className={fieldClass} />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className={labelClass}>Notas</span>
          <textarea name="notes" className={areaClass} />
        </label>
        <div className="md:col-span-2">
          <Button type="submit" size="lg">
            <Plus size={16} />
            Guardar plantilla de gasto
          </Button>
        </div>
      </form>
    </div>
  );
}

function AccountForm() {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Cuenta</p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Nueva cuenta o billetera</h2>
      <form action={createAccount} className="mt-6 grid gap-4">
        <label className="space-y-2">
          <span className={labelClass}>Nombre</span>
          <input name="name" className={fieldClass} placeholder="Caja diario, Nequi gastos, Fondo viaje..." required />
          <p className="text-xs leading-5 text-[var(--muted)]">
            Este nombre es libre. Puedes llamarla como quieras para reconocer mejor su uso.
          </p>
        </label>
        <AccountFormFields />
        <Button type="submit" size="lg">
          <Plus size={16} />
          Crear cuenta
        </Button>
      </form>
    </div>
  );
}

function DebtForm() {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Deuda</p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Nueva obligacion con cuota</h2>
      <form action={createDebt} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClass}>Nombre</span>
          <input name="name" className={fieldClass} placeholder="Solventa, Condensa..." required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Entidad</span>
          <input name="lender" className={fieldClass} placeholder="Entidad o persona" required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Tipo</span>
          <input name="debtType" className={fieldClass} defaultValue="personal" />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Saldo actual</span>
          <input name="balance" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Monto prestado</span>
          <input name="principalAmount" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Cuota</span>
          <input name="installment" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Proximo vencimiento</span>
          <input name="nextDueDate" type="date" className={fieldClass} defaultValue={getToday()} required {...dateFieldProps} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Prioridad</span>
          <select name="priority" className={fieldClass} defaultValue="medium" required>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Tasa anual</span>
          <input name="annualInterestRate" type="number" min="0" step="0.01" className={fieldClass} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Meses plazo</span>
          <input name="termMonths" type="number" min="0" className={fieldClass} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Meses restantes</span>
          <input name="remainingMonths" type="number" min="0" className={fieldClass} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Total estimado</span>
          <input name="estimatedTotalPayment" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className={labelClass}>Notas</span>
          <textarea name="notes" className={areaClass} />
        </label>
        <div className="md:col-span-2">
          <Button type="submit" size="lg">
            <Plus size={16} />
            Guardar deuda
          </Button>
        </div>
      </form>
    </div>
  );
}

function CardForm() {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Tarjeta</p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Nueva tarjeta de credito</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Este modulo es solo para tarjetas de credito. El nombre es libre; el emisor define la identidad visual.
      </p>
      <form action={createCreditCard} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClass}>Nombre visible</span>
          <input name="name" className={fieldClass} placeholder="Visa Bancolombia, RappiCard, Nu..." required />
          <p className="text-xs leading-5 text-[var(--muted)]">Puedes poner el nombre como a ti te haga mas sentido.</p>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Emisor</span>
          <select name="issuer" className={fieldClass} defaultValue="Nu" required>
            {creditCardIssuerOptions.map((issuer) => (
              <option key={issuer} value={issuer}>
                {issuer}
              </option>
            ))}
          </select>
          <p className="text-xs leading-5 text-[var(--muted)]">Incluye emisores comunes en Colombia. Luego podemos ampliar franquicia y tipo.</p>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Cupo</span>
          <input name="limit" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Usado actual</span>
          <input name="used" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} defaultValue="0" required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Dia de corte</span>
          <input name="cutOffDate" type="number" min="1" max="31" className={fieldClass} required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Dia limite de pago</span>
          <input name="payDueDate" type="number" min="1" max="31" className={fieldClass} required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Pago minimo</span>
          <input name="minimumPayment" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Tasa anual</span>
          <input name="annualInterestRate" type="number" min="0" step="0.01" className={fieldClass} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Meses estimados</span>
          <input name="estimatedPayoffMonths" type="number" min="0" className={fieldClass} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Total estimado</span>
          <input name="estimatedTotalPayment" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Estrategia</span>
          <input name="paymentStrategy" className={fieldClass} defaultValue="minimum" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className={labelClass}>Notas</span>
          <textarea name="notes" className={areaClass} />
        </label>
        <div className="md:col-span-2">
          <Button type="submit" size="lg">
            <Plus size={16} />
            Guardar tarjeta
          </Button>
        </div>
      </form>
    </div>
  );
}

function SavingsForm() {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Ahorro</p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Bolsillo o meta protegida</h2>
      <form action={createSavingsGoal} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className={labelClass}>Nombre</span>
          <input name="name" className={fieldClass} placeholder="Colchon, monedas, viaje..." required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Objetivo</span>
          <input name="target" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} required />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Actual</span>
          <input name="current" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} defaultValue="0" />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Fecha meta</span>
          <input name="dueDate" type="date" className={fieldClass} {...dateFieldProps} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Color</span>
          <input name="color" className={fieldClass} defaultValue="success" />
        </label>
        <div className="md:col-span-2">
          <Button type="submit" size="lg">
            <Plus size={16} />
            Guardar ahorro
          </Button>
        </div>
      </form>
    </div>
  );
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function RegisterDependencyState({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Base requerida</p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{title}</h2>
      <div className="arca-soft-block mt-6 rounded-2xl p-4">
        <p className="text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
      <div className="mt-5">
        <Link href={href}>
          <Button size="lg">{cta}</Button>
        </Link>
      </div>
    </div>
  );
}
