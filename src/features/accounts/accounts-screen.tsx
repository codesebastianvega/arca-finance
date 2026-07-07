import Link from "next/link";
import { Landmark, PencilLine, Plus, Trash2, Wallet } from "lucide-react";
import { deleteAccount, updateAccount } from "@/app/actions";
import { Badge, Button, Card, EmptyState, MetricCard } from "@/components/ui-kit";
import { AccountEditorFields } from "@/features/accounts/account-editor-fields";
import { getAccountPresetVisual } from "@/lib/account-presets";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCOP } from "@/lib/finance";

export function AccountsScreen({
  data,
  feedback,
}: {
  data: DashboardData;
  feedback?: {
    saved?: boolean;
    updated?: boolean;
    deleted?: boolean;
    error?: string;
  };
}) {
  const accounts = [...data.accounts].sort((left, right) => right.balance - left.balance);
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  const message = getFeedbackMessage(feedback);

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-2xl sm:rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6 shadow-[var(--elevation-strong)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Cuentas</p>
            <h1 className="mt-2 sm:mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl">Donde vive la caja real.</h1>
            <p className="mt-2 sm:mt-4 text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">Cuentas, billeteras y efectivo. Aqui solo ves lo que ya existe de verdad.</p>
          </div>
          <Link href="/app/registrar?segment=cuenta">
            <Button size="sm">
              <Plus size={16} />
              Nueva cuenta
            </Button>
          </Link>
        </div>
      </section>

      {message ? (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Estado</p>
              <p className="mt-2 text-sm text-[var(--foreground)]">{message.text}</p>
            </div>
            <Badge tone={message.tone}>{message.label}</Badge>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <MetricCard label="Cuentas activas" value={String(accounts.length)} delta="Banco, billetera o efectivo" tone="neutral" />
        <MetricCard label="Caja total" value={formatCOP(total)} delta="Saldo sumado" tone="success" />
        <MetricCard label="Cuenta principal" value={accounts[0] ? formatCOP(accounts[0].balance) : formatCOP(0)} delta={accounts[0]?.name ?? "Sin cuentas"} tone="neutral" />
      </section>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
            <Landmark size={18} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Listado</p>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">Tus cuentas reales</h2>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {accounts.length ? (
            accounts.map((account) => (
              <div key={account.id} className={`rounded-2xl border p-4 ${getAccountPresetVisual(account.color).shellClassName}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border ${getAccountPresetVisual(account.color).badgeClassName}`}>
                      <Wallet size={18} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[var(--foreground)]">{account.name}</p>
                        {!account.active ? <Badge tone="warning">Inactiva</Badge> : null}
                        <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${getAccountPresetVisual(account.color).badgeClassName}`}>
                          <span className={`h-2.5 w-2.5 rounded-full ${getAccountPresetVisual(account.color).dotClassName}`} />
                          {getAccountPresetVisual(account.color).label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">{getAccountTypeLabel(account.type)}</p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-[var(--foreground)]">{formatCOP(account.balance)}</p>
                </div>

                <details className="mt-4 rounded-2xl border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface-2)_82%,transparent)] p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[var(--foreground)]">
                    <span className="inline-flex items-center gap-2">
                      <PencilLine size={16} />
                      Editar o borrar cuenta
                    </span>
                    <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Abrir</span>
                  </summary>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,auto]">
                    <form action={updateAccount} className="grid gap-4">
                      <input type="hidden" name="accountId" value={account.id} />
                      <label className="space-y-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">Nombre</span>
                        <input name="name" className="arca-focus arca-input text-sm" defaultValue={account.name} required />
                      </label>

                      <AccountEditorFields initialType={account.type} initialColor={account.color} />

                      <label className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--foreground)]">
                        <input
                          type="checkbox"
                          name="active"
                          defaultChecked={account.active}
                          value="true"
                          className="h-4 w-4 accent-[var(--accent)]"
                        />
                        Cuenta activa
                      </label>

                      <div className="flex flex-wrap gap-3">
                        <Button type="submit" size="sm">
                          Guardar cambios
                        </Button>
                        <span className="self-center text-xs text-[var(--muted)]">
                          El saldo no se edita aqui. Cambia con movimientos o transferencias para no romper el historial.
                        </span>
                      </div>
                    </form>

                    <form action={deleteAccount} className="xl:w-[240px]">
                      <input type="hidden" name="accountId" value={account.id} />
                      <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--danger)_30%,var(--line)_70%)] bg-[color:color-mix(in_srgb,var(--danger-bg)_72%,transparent)] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Borrado</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                          Solo puedes borrar una cuenta sin movimientos, agenda ni saldo pendiente.
                        </p>
                        <Button type="submit" size="sm" variant="secondary" className="mt-4 w-full justify-center">
                          <Trash2 size={16} />
                          Borrar cuenta
                        </Button>
                      </div>
                    </form>
                  </div>
                </details>
              </div>
            ))
          ) : (
            <EmptyState
              title="Aun no tienes cuentas"
              description="Agrega tu primera cuenta para empezar a ver tu caja real."
              actions={
                <Link href="/app/registrar?segment=cuenta">
                  <Button size="sm">Crear cuenta</Button>
                </Link>
              }
            />
          )}
        </div>
      </Card>
    </div>
  );
}

function getAccountTypeLabel(type: string) {
  const labels: Record<string, string> = {
    cash: "Efectivo",
    bank: "Banco",
    wallet: "Billetera",
    savings: "Ahorro",
    other: "Otra cuenta",
  };

  return labels[type] ?? type;
}

function getFeedbackMessage(feedback?: {
  saved?: boolean;
  updated?: boolean;
  deleted?: boolean;
  error?: string;
}) {
  if (!feedback) return null;
  if (feedback.updated) return { text: "La cuenta se actualizo correctamente.", tone: "success" as const, label: "Actualizada" };
  if (feedback.deleted) return { text: "La cuenta se borro correctamente.", tone: "success" as const, label: "Borrada" };
  if (feedback.saved) return { text: "La cuenta se creo correctamente.", tone: "success" as const, label: "Guardada" };

  if (feedback.error === "linked") {
    return {
      text: "No puedes borrar una cuenta que ya tiene movimientos o agenda asociada.",
      tone: "danger" as const,
      label: "Bloqueada",
    };
  }

  if (feedback.error === "balance") {
    return {
      text: "Primero deja el saldo en cero con movimientos o transferencias antes de borrar la cuenta.",
      tone: "warning" as const,
      label: "Saldo pendiente",
    };
  }

  if (feedback.error) {
    return {
      text: "No se pudo completar la accion sobre la cuenta. Intenta de nuevo.",
      tone: "danger" as const,
      label: "Error",
    };
  }

  return null;
}
