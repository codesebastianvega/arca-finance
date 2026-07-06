import { createTransfer } from "@/app/actions";
import { Button, Card, MetricCard } from "@/components/ui-kit";
import { getAccountPresetVisual } from "@/lib/account-presets";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCOP } from "@/lib/finance";

const fieldClass = "arca-focus arca-input text-sm";
const labelClass = "text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]";

export function TransferScreen({ data }: { data: DashboardData }) {
  const accounts = [...data.accounts].sort((left, right) => right.balance - left.balance);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--elevation-strong)]">
        <div className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Transferir</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Mover caja entre cuentas sin perder trazabilidad.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Esta accion no crea gasto ni ingreso. Solo mueve liquidez entre tus cuentas.
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            Si una entrada sigue como pendiente o programada, aun no aparece aqui como saldo real. Primero confirmala en Hoy.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Cuentas disponibles" value={String(accounts.length)} delta="Origen y destino" tone="neutral" />
        <MetricCard label="Mayor saldo" value={formatCOP(accounts[0]?.balance ?? 0)} delta={accounts[0]?.name ?? "Sin cuentas"} tone="success" />
        <MetricCard label="Caja total" value={formatCOP(accounts.reduce((sum, account) => sum + account.balance, 0))} delta="Antes de mover" tone="neutral" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr,0.8fr]">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Formulario</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Nueva transferencia</h2>
          <form action={createTransfer} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClass}>Cuenta origen</span>
              <select name="fromAccountId" className={fieldClass} required>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {formatCOP(account.balance)}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-5 text-[var(--muted)]">Elige la cuenta que ya tiene saldo real disponible.</p>
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Cuenta destino</span>
              <select name="toAccountId" className={fieldClass} required>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {formatCOP(account.balance)}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-5 text-[var(--muted)]">Elige la cuenta o billetera que recibirá la plata.</p>
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Monto</span>
              <input name="amount" type="number" min="0" step="1" inputMode="numeric" className={fieldClass} required />
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Fecha</span>
              <input name="date" type="date" defaultValue={today()} className={fieldClass} required lang="es-CO" inputMode="numeric" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className={labelClass}>Motivo</span>
              <input name="concept" className={fieldClass} placeholder="Fondear billetera, mover para pagos..." required />
            </label>
            <div className="md:col-span-2">
              <Button type="submit" size="lg">
                Guardar transferencia
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Lectura</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Saldos actuales</h2>
          <div className="mt-5 space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${getAccountPresetVisual(account.color).shellClassName}`}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[var(--foreground)]">{account.name}</p>
                    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${getAccountPresetVisual(account.color).badgeClassName}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${getAccountPresetVisual(account.color).dotClassName}`} />
                      {getAccountPresetVisual(account.color).label}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">{account.type}</p>
                </div>
                <p className="font-semibold text-[var(--foreground)]">{formatCOP(account.balance)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
