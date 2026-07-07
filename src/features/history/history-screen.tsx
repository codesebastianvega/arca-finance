import type React from "react";
import Link from "next/link";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { reverseTransaction, updateTransaction } from "@/app/actions";
import { Badge, Button, Card, EmptyState, MetricCard } from "@/components/ui-kit";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCOP, formatDate, parseCalendarDate } from "@/lib/finance";
import type { Transaction } from "@/lib/types";

type HistoryFilters = {
  month: string;
  kind?: string;
  account?: string;
  unit?: string;
  category?: string;
  status?: string;
};

type HistoryFeedback = {
  reversed?: boolean;
  updated?: boolean;
  error?: string;
};

export function HistoryScreen({
  data,
  filters,
  editId,
  feedback,
}: {
  data: DashboardData;
  filters: HistoryFilters;
  editId?: string;
  feedback?: HistoryFeedback;
}) {
  const monthKey = filters.month;
  const transactions = filterTransactions(data.transactions, filters);
  const totalIncome = transactions.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const totalOutflow = transactions.filter((item) => item.kind !== "income").reduce((sum, item) => sum + item.amount, 0);
  const activeEditTransaction = transactions.find((item) => item.id === editId) ?? null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-2xl sm:rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6 shadow-[var(--elevation-strong)]">
        <div className="max-w-4xl">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Movimientos</p>
          <h1 className="mt-2 sm:mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl">
            Lo real, editable y corregible.
          </h1>
          <p className="mt-2 sm:mt-4 text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
            Aqui ves solo dinero posteado. Puedes filtrar, corregir movimientos manuales y deshacer cualquier registro sin perder el control de caja.
          </p>
        </div>
      </section>

      {feedback?.reversed ? <FeedbackCard tone="warning" text="Movimiento deshecho. La caja y los agregados ligados ya quedaron revertidos." /> : null}
      {feedback?.updated ? <FeedbackCard tone="success" text="Movimiento actualizado. Ya se recalculo la caja con los nuevos datos." /> : null}
      {feedback?.error === "locked_edit" ? (
        <FeedbackCard tone="warning" text="Ese movimiento esta ligado a una deuda, tarjeta, transferencia o evento confirmado. Deshazlo y vuelve a registrarlo en lugar de editarlo directo." />
      ) : null}

      {activeEditTransaction ? (
        <MovementEditCard transaction={activeEditTransaction} data={data} monthKey={monthKey} />
      ) : null}

      <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Movimientos" value={String(transactions.length)} delta={`Mes ${monthKey}`} tone="neutral" />
        <MetricCard label="Ingresos reales" value={formatCOP(totalIncome)} delta="Solo posteado" tone="success" />
        <MetricCard label="Salidas reales" value={formatCOP(totalOutflow)} delta="Gastos y pagos" tone="warning" />
        <MetricCard label="Neto real" value={formatCOP(totalIncome - totalOutflow)} delta="Sin agenda futura" tone={totalIncome - totalOutflow >= 0 ? "success" : "danger"} />
      </section>

      <Card className="p-5">
        <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" action="/app/movimientos">
          <FilterField label="Mes">
            <input name="month" type="month" defaultValue={filters.month} className={fieldClass} />
          </FilterField>
          <FilterField label="Tipo">
            <select name="kind" defaultValue={filters.kind ?? ""} className={fieldClass}>
              <option value="">Todos</option>
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
              <option value="debt_payment">Pago deuda</option>
              <option value="card_payment">Pago tarjeta</option>
              <option value="card_purchase">Compra tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="saving_contribution">Aporte ahorro</option>
              <option value="saving_withdrawal">Retiro ahorro</option>
            </select>
          </FilterField>
          <FilterField label="Cuenta">
            <select name="account" defaultValue={filters.account ?? ""} className={fieldClass}>
              <option value="">Todas</option>
              {data.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Frente">
            <select name="unit" defaultValue={filters.unit ?? ""} className={fieldClass}>
              <option value="">Todos</option>
              {uniqueValues(data.transactions.map((item) => item.unit)).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Categoria">
            <input name="category" defaultValue={filters.category ?? ""} className={fieldClass} placeholder="mercado, gatos, arriendo..." />
          </FilterField>
          <FilterField label="Estado">
            <select name="status" defaultValue={filters.status ?? ""} className={fieldClass}>
              <option value="">Todos</option>
              {uniqueValues(data.transactions.map((item) => item.status)).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </FilterField>
          <div className="flex items-center gap-3 md:col-span-3 xl:col-span-6">
            <Button type="submit" size="sm">
              Filtrar
            </Button>
            <Link href={`/app/movimientos?month=${monthKey}`} className="text-sm text-[var(--muted)] underline-offset-4 hover:underline">
              Limpiar
            </Link>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Tabla operativa</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Crear, corregir o deshacer</h2>
        </div>

        {transactions.length ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-sm">
                <thead className="bg-[color:color-mix(in_srgb,var(--surface)_72%,var(--surface-2)_28%)] text-left text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Fecha</th>
                    <th className="px-5 py-3 font-medium">Concepto</th>
                    <th className="px-5 py-3 font-medium">Tipo</th>
                    <th className="px-5 py-3 font-medium">Cuenta</th>
                    <th className="px-5 py-3 font-medium">Categoria</th>
                    <th className="px-5 py-3 font-medium">Frente</th>
                    <th className="px-5 py-3 font-medium">Estado</th>
                    <th className="px-5 py-3 font-medium text-right">Monto</th>
                    <th className="px-5 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {transactions.map((item) => (
                    <MovementRow key={item.id} item={item} data={data} monthKey={monthKey} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {transactions.map((item) => (
                <MovementCard key={item.id} item={item} data={data} monthKey={monthKey} />
              ))}
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title="Todavia no hay movimientos reales"
              description="Cuando registres o transfieras dinero, aparecera aqui y podras corregirlo si te equivocas."
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function MovementEditCard({
  transaction,
  data,
  monthKey,
}: {
  transaction: Transaction;
  data: DashboardData;
  monthKey: string;
}) {
  const locked = !canEditTransaction(transaction);

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Edicion</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Corregir movimiento</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Si este movimiento es manual, puedes ajustar monto, cuenta, categoria o fecha. Si esta ligado a deuda, tarjeta o transferencia, primero debes deshacerlo.
          </p>
        </div>
        <Link href={`/app/movimientos?month=${monthKey}`} className="text-sm text-[var(--muted)] underline-offset-4 hover:underline">
          Cerrar edicion
        </Link>
      </div>

      {locked ? (
        <div className="mt-5">
          <FeedbackCard tone="warning" text="Este movimiento no se puede editar directo. Deshazlo y vuelve a registrarlo para no romper relaciones de deuda, tarjeta o transferencia." />
        </div>
      ) : (
        <form action={updateTransaction} className="mt-6 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="transactionId" value={transaction.id} />
          <input type="hidden" name="sourceType" value={transaction.sourceType ?? ""} />
          <label className="space-y-2">
            <span className={labelClass}>Tipo</span>
            <select name="kind" className={fieldClass} defaultValue={transaction.kind}>
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
              <option value="saving_contribution">Aporte ahorro</option>
              <option value="saving_withdrawal">Retiro ahorro</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Estado</span>
            <select name="status" className={fieldClass} defaultValue={transaction.status}>
              <option value="paid">Confirmado ahora</option>
              <option value="scheduled">Programado</option>
              <option value="overdue">Vencido</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Valor</span>
            <input name="amount" type="number" min="0" step="1" className={fieldClass} defaultValue={transaction.amount} required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Cuenta</span>
            <select name="accountId" className={fieldClass} defaultValue={transaction.accountId}>
              {data.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {formatCOP(account.balance)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className={labelClass}>Concepto</span>
            <input name="concept" className={fieldClass} defaultValue={transaction.concept} required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Categoria</span>
            <input name="category" className={fieldClass} defaultValue={transaction.category} required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Frente</span>
            <select name="unit" className={fieldClass} defaultValue={transaction.unit}>
              {uniqueValues(data.transactions.map((item) => item.unit)).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Fecha</span>
            <input name="date" type="date" className={fieldClass} defaultValue={transaction.date.slice(0, 10)} required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Vencimiento</span>
            <input name="dueDate" type="date" className={fieldClass} defaultValue={transaction.dueDate?.slice(0, 10) ?? ""} />
          </label>
          {transaction.kind === "income" ? (
            <label className="space-y-2 md:col-span-2">
              <span className={labelClass}>Fuente de ingreso</span>
              <select name="sourceId" className={fieldClass} defaultValue={transaction.sourceId ?? ""}>
                <option value="">Sin ligar</option>
                {data.incomeSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name} {"->"} {source.businessUnitKey}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input type="hidden" name="sourceId" value="" />
          )}
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button type="submit" size="lg">
              Guardar cambios
            </Button>
            <Link href={`/app/movimientos?month=${monthKey}`}>
              <Button type="button" variant="secondary" size="lg">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      )}
    </Card>
  );
}

function MovementRow({ item, data, monthKey }: { item: Transaction; data: DashboardData; monthKey: string }) {
  const account = data.accounts.find((entry) => entry.id === item.accountId);
  const isIncome = item.kind === "income";
  const editable = canEditTransaction(item);

  return (
    <tr className="bg-[color:color-mix(in_srgb,var(--surface)_82%,var(--surface-2)_18%)] align-top">
      <td className="px-5 py-4 text-[var(--muted)]">{formatDate(item.date)}</td>
      <td className="px-5 py-4">
        <p className="font-medium text-[var(--foreground)]">{item.concept}</p>
      </td>
      <td className="px-5 py-4">
        <Badge tone={isIncome ? "success" : "neutral"}>{item.kind}</Badge>
      </td>
      <td className="px-5 py-4 text-[var(--muted)]">{account?.name ?? "Sin cuenta"}</td>
      <td className="px-5 py-4 text-[var(--muted)]">{item.category}</td>
      <td className="px-5 py-4 text-[var(--muted)]">{item.unit}</td>
      <td className="px-5 py-4">
        <Badge tone={item.status === "cancelled" ? "warning" : "neutral"}>{item.status}</Badge>
      </td>
      <td className={`px-5 py-4 text-right font-semibold ${isIncome ? "text-[var(--success)]" : "text-[var(--foreground)]"}`}>
        {isIncome ? "+" : "-"}
        {formatCOP(item.amount)}
      </td>
      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          {editable ? (
            <Link href={`/app/movimientos?month=${monthKey}&edit=${item.id}`}>
              <Button type="button" size="sm" variant="secondary">
                <Pencil size={14} />
                Editar
              </Button>
            </Link>
          ) : null}
          <form action={reverseTransaction}>
            <input type="hidden" name="transactionId" value={item.id} />
            <input type="hidden" name="returnTo" value={`/app/movimientos?month=${monthKey}`} />
            <Button type="submit" size="sm" variant={editable ? "ghost" : "secondary"}>
              {editable ? <Trash2 size={14} /> : <RotateCcw size={14} />}
              {editable ? "Eliminar" : "Deshacer"}
            </Button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function MovementCard({ item, data, monthKey }: { item: Transaction; data: DashboardData; monthKey: string }) {
  const account = data.accounts.find((entry) => entry.id === item.accountId);
  const isIncome = item.kind === "income";
  const editable = canEditTransaction(item);

  return (
    <div className="arca-soft-block rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{formatDate(item.date)}</p>
          <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{item.concept}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={isIncome ? "success" : "neutral"}>{item.kind}</Badge>
            <Badge tone="neutral">{item.status}</Badge>
          </div>
        </div>
        <p className={`text-lg font-semibold ${isIncome ? "text-[var(--success)]" : "text-[var(--foreground)]"}`}>
          {isIncome ? "+" : "-"}
          {formatCOP(item.amount)}
        </p>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
        <p>Cuenta: {account?.name ?? "Sin cuenta"}</p>
        <p>Categoria: {item.category}</p>
        <p>Frente: {item.unit}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {editable ? (
          <Link href={`/app/movimientos?month=${monthKey}&edit=${item.id}`}>
            <Button type="button" size="sm" variant="secondary">
              <Pencil size={14} />
              Editar
            </Button>
          </Link>
        ) : null}
        <form action={reverseTransaction}>
          <input type="hidden" name="transactionId" value={item.id} />
          <input type="hidden" name="returnTo" value={`/app/movimientos?month=${monthKey}`} />
          <Button type="submit" size="sm" variant={editable ? "ghost" : "secondary"}>
            {editable ? <Trash2 size={14} /> : <RotateCcw size={14} />}
            {editable ? "Eliminar" : "Deshacer"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function canEditTransaction(item: Transaction) {
  return (
    item.kind !== "transfer" &&
    item.kind !== "debt_payment" &&
    item.kind !== "card_payment" &&
    item.kind !== "card_purchase" &&
    item.sourceType !== "debt" &&
    item.sourceType !== "credit_card"
  );
}

function filterTransactions(transactions: Transaction[], filters: HistoryFilters) {
  return [...transactions]
    .filter((item) => {
      const monthKey = `${parseCalendarDate(item.date).getFullYear()}-${String(parseCalendarDate(item.date).getMonth() + 1).padStart(2, "0")}`;
      return monthKey === filters.month;
    })
    .filter((item) => !filters.kind || item.kind === filters.kind)
    .filter((item) => !filters.account || item.accountId === filters.account)
    .filter((item) => !filters.unit || item.unit === filters.unit)
    .filter((item) => !filters.status || item.status === filters.status)
    .filter((item) => !filters.category || item.category.toLowerCase().includes(filters.category.toLowerCase()))
    .sort((left, right) => parseCalendarDate(right.date).getTime() - parseCalendarDate(left.date).getTime());
}

function uniqueValues(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function FeedbackCard({ tone, text }: { tone: "success" | "warning"; text: string }) {
  return (
    <div className={`rounded-2xl border p-4 text-sm ${tone === "success" ? "border-[var(--success)] bg-[var(--success-bg)] text-[var(--success)]" : "border-[var(--warning)] bg-[var(--warning-bg)] text-[var(--warning)]"}`}>
      {text}
    </div>
  );
}

const fieldClass = "arca-focus arca-input h-11 w-full px-3 text-sm";
const labelClass = "text-xs uppercase tracking-[0.18em] text-[var(--muted)]";
