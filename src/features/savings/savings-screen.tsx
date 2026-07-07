import Link from "next/link";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { deleteSavingsGoal, updateSavingsGoal } from "@/app/actions";
import { Badge, Button, Card, MetricCard } from "@/components/ui-kit";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCOP } from "@/lib/finance";

export function SavingsScreen({
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
  const savingsTransactions = data.transactions.filter((item) => item.kind === "saving_contribution" || item.kind === "saving_withdrawal");
  const protectedTotal = data.goals.reduce((sum, goal) => sum + goal.current, 0);
  const targetTotal = data.goals.reduce((sum, goal) => sum + goal.target, 0);
  const message = getSavingsFeedback(feedback);

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-2xl sm:rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6 shadow-[var(--elevation-strong)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Ahorro</p>
            <h1 className="mt-2 sm:mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl">Bolsillos y metas reales.</h1>
            <p className="mt-2 sm:mt-4 text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">Esta vista solo enseña metas creadas por ti y movimientos reales de ahorro.</p>
          </div>
          <Link href="/app/registrar?segment=ahorro">
            <Button size="sm">
              <Plus size={16} />
              Nueva meta
            </Button>
          </Link>
        </div>
      </section>

      {message ? (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--foreground)]">{message.text}</p>
            <Badge tone={message.tone}>{message.label}</Badge>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Metas activas" value={String(data.goals.length)} delta="Solo datos reales" tone="neutral" />
        <MetricCard label="Ahorro protegido" value={formatCOP(protectedTotal)} delta="Fuera de caja libre" tone="success" />
        <MetricCard label="Objetivo total" value={formatCOP(targetTotal)} delta="Suma de metas" tone="neutral" />
        <MetricCard label="Movimientos ahorro" value={String(savingsTransactions.length)} delta="Aportes y retiros" tone="warning" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--success-bg)] text-[var(--success)]">
              <PiggyBank size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Metas</p>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">Lo que si existe</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {data.goals.length ? (
              data.goals.map((goal) => {
                const progress = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
                return (
                  <div key={goal.id} className="arca-soft-block rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{goal.name}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {formatCOP(goal.current)} de {formatCOP(goal.target)}
                        </p>
                      </div>
                      <Badge tone={progress >= 100 ? "success" : "neutral"}>{progress}%</Badge>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-[var(--surface-2)]">
                      <div className="h-2 rounded-full bg-[var(--success)]" style={{ width: `${progress}%` }} />
                    </div>

                    <details className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                      <summary className="cursor-pointer list-none text-sm font-medium text-[var(--foreground)]">Editar meta</summary>
                      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,220px]">
                        <form action={updateSavingsGoal} className="grid gap-4 md:grid-cols-2">
                          <input type="hidden" name="goalId" value={goal.id} />
                          <label className="space-y-2 md:col-span-2">
                            <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Nombre</span>
                            <input name="name" className="arca-focus arca-input text-sm" defaultValue={goal.name} required />
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Objetivo</span>
                            <input name="target" type="number" min="0" step="1" inputMode="numeric" className="arca-focus arca-input text-sm" defaultValue={goal.target} required />
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Fecha meta</span>
                            <input name="dueDate" type="date" className="arca-focus arca-input text-sm" defaultValue={goal.dueDate?.slice(0, 10) ?? ""} />
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Identidad visual</span>
                            <select name="color" defaultValue={goal.color} className="arca-focus arca-input text-sm">
                              <option value="success">Verde ahorro</option>
                              <option value="olive">Oliva</option>
                              <option value="accent">Arca</option>
                              <option value="copper">Cobre</option>
                            </select>
                          </label>
                          <div className="md:col-span-2">
                            <Button type="submit" size="sm">Guardar cambios</Button>
                          </div>
                        </form>

                        <form action={deleteSavingsGoal}>
                          <input type="hidden" name="goalId" value={goal.id} />
                          <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--danger)_30%,var(--line)_70%)] bg-[color:color-mix(in_srgb,var(--danger-bg)_72%,transparent)] p-4">
                            <p className="text-sm leading-6 text-[var(--foreground)]">
                              Solo puedes borrar una meta sin saldo protegido ni movimientos asociados.
                            </p>
                            <Button type="submit" size="sm" variant="secondary" className="mt-4 w-full justify-center">
                              <Trash2 size={16} />
                              Borrar meta
                            </Button>
                          </div>
                        </form>
                      </div>
                    </details>
                  </div>
                );
              })
            ) : (
              <div className="arca-muted-block rounded-2xl p-6 text-sm text-[var(--muted)]">
                Aun no hay metas ni bolsillos creados. El siguiente paso real es crear la primera meta desde{" "}
                <Link href="/app/registrar?segment=ahorro" className="underline">
                  Registrar
                </Link>
                .
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Historial ahorro</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Aportes y retiros</h2>
          <div className="mt-5 space-y-3">
            {savingsTransactions.length ? (
              savingsTransactions.slice(0, 12).map((item) => (
                <div key={item.id} className="arca-soft-block rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{item.concept}</p>
                      <p className="text-sm text-[var(--muted)]">{item.kind === "saving_contribution" ? "Aporte" : "Retiro"} - {item.category}</p>
                    </div>
                    <p className={`font-semibold ${item.kind === "saving_contribution" ? "text-[var(--foreground)]" : "text-[var(--danger)]"}`}>
                      {item.kind === "saving_contribution" ? "-" : "+"}
                      {formatCOP(item.amount)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="arca-muted-block rounded-2xl p-6 text-sm text-[var(--muted)]">Todavia no existen movimientos reales de ahorro.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function getSavingsFeedback(feedback?: {
  saved?: boolean;
  updated?: boolean;
  deleted?: boolean;
  error?: string;
}) {
  if (!feedback) return null;
  if (feedback.updated) return { text: "La meta se actualizo correctamente.", tone: "success" as const, label: "Actualizada" };
  if (feedback.deleted) return { text: "La meta se borro correctamente.", tone: "success" as const, label: "Borrada" };
  if (feedback.saved) return { text: "La meta se creo correctamente.", tone: "success" as const, label: "Guardada" };
  if (feedback.error === "balance_goal") return { text: "Primero deja el ahorro protegido en cero antes de borrar la meta.", tone: "warning" as const, label: "Saldo protegido" };
  if (feedback.error === "linked_goal") return { text: "No puedes borrar una meta con movimientos de ahorro asociados.", tone: "danger" as const, label: "Bloqueada" };
  if (feedback.error) return { text: "No se pudo completar la accion sobre la meta.", tone: "danger" as const, label: "Error" };
  return null;
}
