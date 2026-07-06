import type React from "react";
import Link from "next/link";
import { reverseTransaction } from "@/app/actions";
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

export function HistoryScreen({
  data,
  filters,
}: {
  data: DashboardData;
  filters: HistoryFilters;
}) {
  const monthKey = filters.month;
  const transactions = filterTransactions(data.transactions, filters);
  const totalIncome = transactions.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const totalOutflow = transactions
    .filter((item) => item.kind !== "income")
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_16px_44px_rgba(16,16,16,0.06)]">
        <div className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Historial</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Movimientos reales, filtros y correcciones.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Aqui vive lo posteado de verdad. Lo programado se queda en obligaciones. Si te equivocaste, deshaz desde esta vista y vuelve a registrar bien.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Movimientos" value={String(transactions.length)} delta={`Mes ${monthKey}`} tone="neutral" />
        <MetricCard label="Ingresos reales" value={formatCOP(totalIncome)} delta="Posteados en historial" tone="success" />
        <MetricCard label="Salidas reales" value={formatCOP(totalOutflow)} delta="Gastos y pagos registrados" tone="warning" />
        <MetricCard label="Neto real" value={formatCOP(totalIncome - totalOutflow)} delta="Sin contar agenda futura" tone={totalIncome - totalOutflow >= 0 ? "success" : "danger"} />
      </section>

      <Card className="p-5">
        <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" action="/app/historial">
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
          <FilterField label="Unidad">
            <select name="unit" defaultValue={filters.unit ?? ""} className={fieldClass}>
              <option value="">Todas</option>
              {uniqueValues(data.transactions.map((item) => item.unit)).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Categoria">
            <input
              name="category"
              defaultValue={filters.category ?? ""}
              className={fieldClass}
              placeholder="mercado, gatos, arriendo..."
            />
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
          <div className="md:col-span-3 xl:col-span-6 flex items-center gap-3">
            <Button type="submit" size="sm">
              Filtrar
            </Button>
            <Link href={`/app/historial?month=${monthKey}`} className="text-sm text-[var(--muted)] underline-offset-4 hover:underline">
              Limpiar
            </Link>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Tabla operativa</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Lo real del mes</h2>
        </div>
        {transactions.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[color:color-mix(in_srgb,var(--surface)_72%,var(--surface-2)_28%)] text-left text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Concepto</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Cuenta</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">Unidad</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium text-right">Monto</th>
                  <th className="px-5 py-3 font-medium text-right">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {transactions.map((item) => {
                  const account = data.accounts.find((entry) => entry.id === item.accountId);
                  const isIncome = item.kind === "income";
                  return (
                    <tr key={item.id} className="bg-[color:color-mix(in_srgb,var(--surface)_82%,var(--surface-2)_18%)] align-top">
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
                        <div className="flex justify-end">
                          <form action={reverseTransaction}>
                            <input type="hidden" name="transactionId" value={item.id} />
                            <Button type="submit" size="sm" variant="secondary">
                              Deshacer
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title="Todavía no hay movimientos registrados"
              description="Cuando registres o transfieras dinero, aparecerá aquí."
            />
          </div>
        )}
      </Card>
    </div>
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

const fieldClass = "arca-focus arca-input h-11 w-full px-3 text-sm";
