import Link from "next/link";
import { deleteExpenseTemplate, deleteIncomeTemplate, ensureScheduledEventsForMonth, updateExpenseTemplate, updateIncomeTemplate } from "@/app/actions";
import { Badge, Button, Card, MetricCard } from "@/components/ui-kit";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCOP, formatDate, parseCalendarDate } from "@/lib/finance";
import { getScheduledEventStatusLabel } from "@/lib/template-generation";

const fieldClass = "arca-focus arca-input text-sm";

export function MonthScreen({
  data,
  monthKey,
  feedback,
}: {
  data: DashboardData;
  monthKey: string;
  feedback?: {
    saved?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  };
}) {
  const events = data.scheduledEvents
    .filter((item) => monthMatches(item.dueDate, monthKey))
    .sort((left, right) => parseCalendarDate(left.dueDate).getTime() - parseCalendarDate(right.dueDate).getTime());
  const expectedIncome = events.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const expectedOutflow = events.filter((item) => item.kind !== "income").reduce((sum, item) => sum + item.amount, 0);
  const posted = data.transactions.filter((item) => monthMatches(item.date, monthKey));
  const realIncome = posted.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const realOutflow = posted.filter((item) => item.kind !== "income").reduce((sum, item) => sum + item.amount, 0);
  const message = getMonthFeedback(feedback);

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-2xl sm:rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6 shadow-[0_16px_44px_rgba(16,16,16,0.06)]">
        <div className="max-w-4xl">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Planeacion / Mes</p>
          <h1 className="mt-2 sm:mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl">Agenda operativa del mes.</h1>
          <p className="mt-2 sm:mt-4 text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
            Esta vista separa dos capas de forma explicita: lo real ya posteado y lo esperado que todavia no se confirma.
          </p>
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
        <MetricCard label="Ingresos esperados" value={formatCOP(expectedIncome)} delta={`Mes ${monthKey}`} tone="neutral" />
        <MetricCard label="Salidas esperadas" value={formatCOP(expectedOutflow)} delta={`${events.length} eventos en agenda`} tone="warning" />
        <MetricCard label="Ingreso real" value={formatCOP(realIncome)} delta="Movimientos confirmados" tone="success" />
        <MetricCard label="Salida real" value={formatCOP(realOutflow)} delta="Gastos y pagos posteados" tone="neutral" />
      </section>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Cronologia</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Lo programado del mes</h2>
          </div>
          <div className="flex gap-3">
            <form action={ensureScheduledEventsForMonth}>
              <input type="hidden" name="returnTo" value={`/app/planeacion/mes?month=${monthKey}`} />
              <Button size="sm" variant="secondary" type="submit">Regenerar agenda</Button>
            </form>
            <Link href="/app/registrar?segment=movimiento">
              <Button size="sm">Registrar</Button>
            </Link>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {events.length ? (
            events.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_82%,var(--surface-2)_18%)] px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--foreground)]">{event.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {event.kind} - {formatDate(event.dueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone={event.status === "overdue" ? "danger" : event.kind === "income" ? "success" : "warning"}>
                    {getScheduledEventStatusLabel(event.status)}
                  </Badge>
                  <p className={`mt-2 font-semibold ${event.kind === "income" ? "text-[var(--success)]" : "text-[var(--foreground)]"}`}>
                    {event.kind === "income" ? "+" : "-"}
                    {formatCOP(event.amount)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_74%,transparent)] p-6 text-sm text-[var(--muted)]">
              No hay agenda cargada para este mes.
            </div>
          )}
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Plantillas de ingreso</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Lo que deberia entrar</h2>
            </div>
            <Link href="/app/registrar?segment=plantilla_ingreso">
              <Button size="sm">Nueva plantilla</Button>
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {data.incomeTemplates.length ? (
              data.incomeTemplates.map((template) => (
                <details key={template.id} className="rounded-2xl border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_82%,var(--surface-2)_18%)] p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{template.name}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {template.frequency} - {formatCOP(template.defaultAmount)}
                        </p>
                      </div>
                      <Badge tone="success">{template.status}</Badge>
                    </div>
                  </summary>
                  <div className="mt-4 grid gap-3 xl:grid-cols-[1fr,220px]">
                    <form action={updateIncomeTemplate} className="grid gap-3 md:grid-cols-2">
                      <input type="hidden" name="templateId" value={template.id} />
                      <label className="space-y-2 md:col-span-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Nombre</span>
                        <input name="name" className={fieldClass} defaultValue={template.name} required />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Fuente</span>
                        <select name="incomeSourceId" className={fieldClass} defaultValue={template.incomeSourceId}>
                          {data.incomeSources.map((source) => (
                            <option key={source.id} value={source.id}>
                              {source.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Frente</span>
                        <select name="businessUnitKey" className={fieldClass} defaultValue={template.businessUnitKey}>
                          {data.business.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Cuenta</span>
                        <select name="defaultAccountId" className={fieldClass} defaultValue={template.defaultAccountId}>
                          {data.accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Monto</span>
                        <input name="defaultAmount" type="number" min="0" step="1" className={fieldClass} defaultValue={template.defaultAmount} />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Frecuencia</span>
                        <select name="frequency" className={fieldClass} defaultValue={template.frequency}>
                          <option value="monthly">Mensual</option>
                          <option value="biweekly">Quincenal</option>
                          <option value="weekly">Semanal</option>
                          <option value="bimonthly">Bimestral</option>
                          <option value="custom_days_of_month">Dias del mes</option>
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Dias del mes</span>
                        <input name="daysOfMonth" className={fieldClass} defaultValue={template.daysOfMonth.join(",")} />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Modo</span>
                        <select name="recurrenceMode" className={fieldClass} defaultValue={template.recurrenceMode}>
                          <option value="open_recurring">Indefinido</option>
                          <option value="date_bounded">Con fecha fin</option>
                          <option value="occurrence_bounded">Por numero de veces</option>
                          <option value="manual_variable">Variable manual</option>
                          <option value="one_time">Una sola vez</option>
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Inicio</span>
                        <input name="startDate" type="date" className={fieldClass} defaultValue={template.startDate.slice(0, 10)} />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Fecha fin</span>
                        <input name="endDate" type="date" className={fieldClass} defaultValue={template.endDate?.slice(0, 10) ?? ""} />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Numero de veces</span>
                        <input name="occurrenceLimit" type="number" min="1" className={fieldClass} defaultValue={template.occurrenceLimit ?? ""} />
                      </label>
                      <label className="space-y-2 md:col-span-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Notas</span>
                        <textarea name="notes" className={`${fieldClass} arca-input-area`} defaultValue={template.notes ?? ""} />
                      </label>
                      <div className="md:col-span-2">
                        <Button type="submit" size="sm">Guardar plantilla</Button>
                      </div>
                    </form>
                    <form action={deleteIncomeTemplate}>
                      <input type="hidden" name="templateId" value={template.id} />
                      <Button type="submit" size="sm" variant="secondary">Borrar plantilla</Button>
                    </form>
                  </div>
                </details>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_74%,transparent)] p-6 text-sm text-[var(--muted)]">
                Aun no hay plantillas de ingreso.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Plantillas de salida</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Lo que deberia salir</h2>
            </div>
            <Link href="/app/registrar?segment=plantilla_gasto">
              <Button size="sm">Nueva plantilla</Button>
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {data.expenseTemplates.length ? (
              data.expenseTemplates.map((template) => (
                <details key={template.id} className="rounded-2xl border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_82%,var(--surface-2)_18%)] p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{template.name}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {template.kind} - {formatCOP(template.defaultAmount)}
                        </p>
                      </div>
                      <Badge tone="warning">{template.status}</Badge>
                    </div>
                  </summary>
                  <div className="mt-4 grid gap-3 xl:grid-cols-[1fr,220px]">
                    <form action={updateExpenseTemplate} className="grid gap-3 md:grid-cols-2">
                      <input type="hidden" name="templateId" value={template.id} />
                      <label className="space-y-2 md:col-span-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Nombre</span>
                        <input name="name" className={fieldClass} defaultValue={template.name} required />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Tipo</span>
                        <select name="kind" className={fieldClass} defaultValue={template.kind}>
                          <option value="expense">Gasto</option>
                          <option value="saving">Ahorro</option>
                          <option value="debt_payment">Pago deuda</option>
                          <option value="card_payment">Pago tarjeta</option>
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Frente</span>
                        <select name="businessUnitKey" className={fieldClass} defaultValue={template.businessUnitKey}>
                          {data.business.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Cuenta</span>
                        <select name="defaultAccountId" className={fieldClass} defaultValue={template.defaultAccountId}>
                          {data.accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Monto</span>
                        <input name="defaultAmount" type="number" min="0" step="1" className={fieldClass} defaultValue={template.defaultAmount} />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Frecuencia</span>
                        <select name="frequency" className={fieldClass} defaultValue={template.frequency}>
                          <option value="monthly">Mensual</option>
                          <option value="biweekly">Quincenal</option>
                          <option value="weekly">Semanal</option>
                          <option value="bimonthly">Bimestral</option>
                          <option value="custom_days_of_month">Dias del mes</option>
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Dias del mes</span>
                        <input name="daysOfMonth" className={fieldClass} defaultValue={template.daysOfMonth.join(",")} />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Modo</span>
                        <select name="recurrenceMode" className={fieldClass} defaultValue={template.recurrenceMode}>
                          <option value="open_recurring">Indefinido</option>
                          <option value="date_bounded">Con fecha fin</option>
                          <option value="occurrence_bounded">Por numero de veces</option>
                          <option value="manual_variable">Variable manual</option>
                          <option value="one_time">Una sola vez</option>
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Inicio</span>
                        <input name="startDate" type="date" className={fieldClass} defaultValue={template.startDate.slice(0, 10)} />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Fecha fin</span>
                        <input name="endDate" type="date" className={fieldClass} defaultValue={template.endDate?.slice(0, 10) ?? ""} />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Numero de veces</span>
                        <input name="occurrenceLimit" type="number" min="1" className={fieldClass} defaultValue={template.occurrenceLimit ?? ""} />
                      </label>
                      <label className="space-y-2 md:col-span-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Notas</span>
                        <textarea name="notes" className={`${fieldClass} arca-input-area`} defaultValue={template.notes ?? ""} />
                      </label>
                      <div className="md:col-span-2">
                        <Button type="submit" size="sm">Guardar plantilla</Button>
                      </div>
                    </form>
                    <form action={deleteExpenseTemplate}>
                      <input type="hidden" name="templateId" value={template.id} />
                      <Button type="submit" size="sm" variant="secondary">Borrar plantilla</Button>
                    </form>
                  </div>
                </details>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_74%,transparent)] p-6 text-sm text-[var(--muted)]">
                Aun no hay plantillas de salida.
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

function getMonthFeedback(feedback?: {
  saved?: string;
  updated?: string;
  deleted?: string;
  error?: string;
}) {
  if (!feedback) return null;
  if (feedback.updated === "template_income" || feedback.updated === "template_expense") {
    return { text: "La plantilla se actualizo correctamente.", tone: "success" as const, label: "Actualizada" };
  }
  if (feedback.deleted === "template_income" || feedback.deleted === "template_expense") {
    return { text: "La plantilla se borro correctamente.", tone: "success" as const, label: "Borrada" };
  }
  if (feedback.saved === "template_income" || feedback.saved === "template_expense") {
    return { text: "La plantilla se creo correctamente.", tone: "success" as const, label: "Guardada" };
  }
  if (feedback.error) {
    return { text: "No se pudo completar la accion sobre la agenda del mes.", tone: "danger" as const, label: "Error" };
  }
  return null;
}

function monthMatches(value: string, monthKey: string) {
  const date = parseCalendarDate(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === monthKey;
}
