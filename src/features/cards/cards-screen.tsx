import Link from "next/link";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { deleteCreditCard, updateCreditCard } from "@/app/actions";
import { Badge, Button, Card, EmptyState, MetricCard } from "@/components/ui-kit";
import { creditCardIssuerOptions, normalizeCardIssuer } from "@/lib/card-issuers";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCOP } from "@/lib/finance";

type WalletTheme = {
  shell: string;
  accent: string;
  muted: string;
};

const issuerThemes: Record<string, WalletTheme> = {
  nu: {
    shell: "bg-[color:color-mix(in_srgb,var(--accent)_72%,var(--surface)_28%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--accent)_76%,var(--border)_24%)]",
    accent: "text-[var(--copper-soft)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  rappi: {
    shell: "bg-[color:color-mix(in_srgb,var(--danger)_62%,var(--surface)_38%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--danger)_74%,var(--border)_26%)]",
    accent: "text-[var(--warning-bg)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  falabella: {
    shell: "bg-[color:color-mix(in_srgb,var(--success)_58%,var(--surface)_42%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--success)_72%,var(--border)_28%)]",
    accent: "text-[var(--olive-soft)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  codensa: {
    shell: "bg-[color:color-mix(in_srgb,var(--olive)_68%,var(--accent)_32%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--olive)_70%,var(--border)_30%)]",
    accent: "text-[var(--copper-soft)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  enel: {
    shell: "bg-[color:color-mix(in_srgb,var(--olive)_68%,var(--accent)_32%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--olive)_70%,var(--border)_30%)]",
    accent: "text-[var(--copper-soft)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  davivienda: {
    shell: "bg-[color:color-mix(in_srgb,var(--danger)_56%,var(--accent)_44%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--danger)_70%,var(--border)_30%)]",
    accent: "text-[var(--warning-bg)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  bancolombia: {
    shell: "bg-[color:color-mix(in_srgb,var(--accent-2)_62%,var(--accent)_38%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--accent-2)_72%,var(--border)_28%)]",
    accent: "text-[var(--warning-bg)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  bbva: {
    shell: "bg-[color:color-mix(in_srgb,var(--accent)_78%,var(--surface)_22%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--accent)_80%,var(--border)_20%)]",
    accent: "text-[var(--warning-bg)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  bogota: {
    shell: "bg-[color:color-mix(in_srgb,var(--copper)_72%,var(--surface)_28%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--copper)_76%,var(--border)_24%)]",
    accent: "text-[var(--warning-bg)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  colpatria: {
    shell: "bg-[color:color-mix(in_srgb,var(--danger)_54%,var(--surface)_46%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--danger)_64%,var(--border)_36%)]",
    accent: "text-[var(--warning-bg)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  itau: {
    shell: "bg-[color:color-mix(in_srgb,var(--copper)_78%,var(--danger)_22%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--copper)_82%,var(--border)_18%)]",
    accent: "text-[var(--warning-bg)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  occidente: {
    shell: "bg-[color:color-mix(in_srgb,var(--success)_48%,var(--surface)_52%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--success)_62%,var(--border)_38%)]",
    accent: "text-[var(--olive-soft)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  villas: {
    shell: "bg-[color:color-mix(in_srgb,var(--accent-2)_56%,var(--surface)_44%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--accent-2)_68%,var(--border)_32%)]",
    accent: "text-[var(--warning-bg)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  popular: {
    shell: "bg-[color:color-mix(in_srgb,var(--copper)_58%,var(--surface)_42%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--copper)_68%,var(--border)_32%)]",
    accent: "text-[var(--warning-bg)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
  finandina: {
    shell: "bg-[color:color-mix(in_srgb,var(--olive)_62%,var(--surface)_38%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--olive)_70%,var(--border)_30%)]",
    accent: "text-[var(--copper-soft)]",
    muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
  },
};

export function CardsScreen({
  data,
  selectedCardId,
  feedback,
}: {
  data: DashboardData;
  selectedCardId?: string;
  feedback?: {
    saved?: boolean;
    updated?: boolean;
    deleted?: boolean;
    error?: string;
  };
}) {
  const selectedCard = data.cards.find((card) => card.id === selectedCardId) ?? data.cards[0];
  const cardEvents = selectedCard
    ? data.scheduledEvents.filter(
        (event) =>
          event.linkedEntityType === "credit_card" &&
          event.linkedEntityId === selectedCard.id &&
          !["paid", "confirmed", "cancelled"].includes(event.status)
      )
    : [];
  const message = getCardsFeedback(feedback);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--elevation-strong)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Tarjetas</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">Gestion de tarjetas y lectura de credito.</h1>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">Aqui controlas cupo, uso, pago minimo y fechas clave de cada tarjeta.</p>
          </div>
          <Link href="/app/registrar?segment=tarjeta">
            <Button size="sm">
              <Plus size={16} />
              Nueva tarjeta
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tarjetas activas" value={String(data.cards.length)} delta="Bloqueadas y activas" tone="neutral" />
        <MetricCard label="Uso total" value={formatCOP(data.cards.reduce((sum, card) => sum + card.used, 0))} delta="Exposicion rotativa" tone="warning" />
        <MetricCard label="Cupo total" value={formatCOP(data.cards.reduce((sum, card) => sum + card.limit, 0))} delta="Base para uso %" tone="neutral" />
        <MetricCard
          label="Pago minimo abierto"
          value={formatCOP(data.cards.reduce((sum, card) => sum + card.minimumPayment, 0))}
          delta="Leer junto a obligaciones"
          tone="danger"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-4">
          {data.cards.map((card) => {
            const theme = getIssuerTheme(card.issuer);
            const utilization = card.limit > 0 ? Math.round((card.used / card.limit) * 100) : 0;
            const selected = selectedCard?.id === card.id;

            return (
              <Link key={card.id} href={`/app/dinero/tarjetas?card=${card.id}`} className="block">
                <div
                  className={`${theme.shell} rounded-[26px] border border-t-[var(--border-top-highlight)] p-5 shadow-[var(--elevation-strong)] ${
                    selected ? "ring-2 ring-[var(--accent-2)]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs uppercase tracking-[0.22em] ${theme.muted}`}>{card.issuer}</p>
                      <h2 className="mt-2 text-2xl font-semibold">{card.name}</h2>
                      <p className={`mt-4 text-[11px] uppercase tracking-[0.3em] ${theme.muted}`}>Tarjeta de credito</p>
                    </div>
                    <Badge tone={card.status === "blocked" ? "danger" : "success"}>{card.status}</Badge>
                  </div>
                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <WalletMetric label="Usado" value={formatCOP(card.used)} accent={theme.accent} muted={theme.muted} />
                    <WalletMetric label="Cupo" value={formatCOP(card.limit)} accent={theme.accent} muted={theme.muted} />
                    <WalletMetric label="Uso" value={`${utilization}%`} accent={theme.accent} muted={theme.muted} />
                  </div>
                  <div className={`mt-6 flex flex-wrap gap-4 text-sm ${theme.muted}`}>
                    <span>Minimo {formatCOP(card.minimumPayment)}</span>
                    <span>Pago {card.payDueDate}</span>
                    <span>Corte {card.cutOffDate}</span>
                  </div>
                  <div className={`mt-8 flex items-center justify-between text-xs uppercase tracking-[0.28em] ${theme.muted}`}>
                    <span>Credito</span>
                    <span>Arca</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <Card className="p-5">
          {selectedCard ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Detalle</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{selectedCard.name}</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">{selectedCard.issuer}</p>
                </div>
                <div className="arca-soft-block flex h-11 w-11 items-center justify-center rounded-2xl">
                  <CreditCard size={18} />
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <DetailRow label="Usado" value={formatCOP(selectedCard.used)} />
                <DetailRow label="Disponible" value={formatCOP(Math.max(0, selectedCard.limit - selectedCard.used))} />
                <DetailRow label="Pago minimo" value={formatCOP(selectedCard.minimumPayment)} />
                <DetailRow label="Fecha limite" value={`Dia ${selectedCard.payDueDate}`} />
                <DetailRow label="Fecha corte" value={`Dia ${selectedCard.cutOffDate}`} />
                <DetailRow label="Tasa anual" value={selectedCard.annualInterestRate ? `${selectedCard.annualInterestRate}%` : "Por cargar"} />
                <DetailRow label="Total estimado" value={selectedCard.estimatedTotalPayment ? formatCOP(selectedCard.estimatedTotalPayment) : "Por estimar"} />
                <DetailRow label="Estrategia" value={selectedCard.paymentStrategy ?? "minimum"} />
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Pagos y eventos abiertos</p>
                <div className="mt-3 space-y-3">
                  {cardEvents.length ? (
                    cardEvents.map((event) => (
                      <div key={event.id} className="arca-soft-block rounded-2xl px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-[var(--foreground)]">{event.title}</p>
                            <p className="text-sm text-[var(--muted)]">{event.dueDate}</p>
                          </div>
                          <p className="font-semibold text-[var(--foreground)]">{formatCOP(event.amount)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No hay pagos pendientes en esta tarjeta"
                      description="Cuando cargues compras o pagos programados, apareceran aqui."
                      className="p-4"
                    />
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/app/obligaciones">
                  <Button size="sm">Ir a obligaciones</Button>
                </Link>
              </div>

              <details className="mt-6 rounded-2xl border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface-2)_82%,transparent)] p-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-[var(--foreground)]">Editar tarjeta</summary>
                <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,240px]">
                  <form action={updateCreditCard} className="grid gap-4 md:grid-cols-2">
                    <input type="hidden" name="cardId" value={selectedCard.id} />
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Nombre</span>
                      <input name="name" className="arca-focus arca-input text-sm" defaultValue={selectedCard.name} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Emisor</span>
                      <select name="issuer" className="arca-focus arca-input text-sm" defaultValue={selectedCard.issuer}>
                        {creditCardIssuerOptions.map((issuer) => (
                          <option key={issuer} value={issuer}>
                            {issuer}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Cupo</span>
                      <input name="limit" type="number" min="0" step="1" inputMode="numeric" className="arca-focus arca-input text-sm" defaultValue={selectedCard.limit} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Usado actual</span>
                      <input name="used" type="number" min="0" step="1" inputMode="numeric" className="arca-focus arca-input text-sm" defaultValue={selectedCard.used} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Dia corte</span>
                      <input name="cutOffDate" type="number" min="1" max="31" className="arca-focus arca-input text-sm" defaultValue={selectedCard.cutOffDate} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Dia pago</span>
                      <input name="payDueDate" type="number" min="1" max="31" className="arca-focus arca-input text-sm" defaultValue={selectedCard.payDueDate} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Pago minimo</span>
                      <input name="minimumPayment" type="number" min="0" step="1" inputMode="numeric" className="arca-focus arca-input text-sm" defaultValue={selectedCard.minimumPayment} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Estado</span>
                      <select name="status" className="arca-focus arca-input text-sm" defaultValue={selectedCard.status}>
                        <option value="active">Activa</option>
                        <option value="blocked">Bloqueada</option>
                        <option value="closed">Cerrada</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Tasa anual</span>
                      <input name="annualInterestRate" type="number" min="0" step="0.01" className="arca-focus arca-input text-sm" defaultValue={selectedCard.annualInterestRate ?? ""} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Meses estimados</span>
                      <input name="estimatedPayoffMonths" type="number" min="0" className="arca-focus arca-input text-sm" defaultValue={selectedCard.estimatedPayoffMonths ?? ""} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Total estimado</span>
                      <input name="estimatedTotalPayment" type="number" min="0" step="1" inputMode="numeric" className="arca-focus arca-input text-sm" defaultValue={selectedCard.estimatedTotalPayment ?? ""} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Estrategia</span>
                      <input name="paymentStrategy" className="arca-focus arca-input text-sm" defaultValue={selectedCard.paymentStrategy ?? ""} />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Notas</span>
                      <textarea name="notes" className="arca-focus arca-input arca-input-area text-sm" defaultValue={selectedCard.notes ?? ""} />
                    </label>
                    <div className="md:col-span-2">
                      <Button type="submit" size="sm">Guardar cambios</Button>
                    </div>
                  </form>

                  <form action={deleteCreditCard}>
                    <input type="hidden" name="cardId" value={selectedCard.id} />
                    <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--danger)_30%,var(--line)_70%)] bg-[color:color-mix(in_srgb,var(--danger-bg)_72%,transparent)] p-4">
                      <p className="text-sm leading-6 text-[var(--foreground)]">
                        Solo puedes borrar una tarjeta sin compras, pagos ni saldo usado.
                      </p>
                      <Button type="submit" size="sm" variant="secondary" className="mt-4 w-full justify-center">
                        <Trash2 size={16} />
                        Borrar tarjeta
                      </Button>
                    </div>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <EmptyState
              title="No tienes tarjetas registradas"
              description="Agrega tus tarjetas de credito para controlar cupo y fechas de pago."
              actions={
                <Link href="/app/registrar?segment=tarjeta">
                  <Button size="sm">Agregar tarjeta</Button>
                </Link>
              }
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function getCardsFeedback(feedback?: {
  saved?: boolean;
  updated?: boolean;
  deleted?: boolean;
  error?: string;
}) {
  if (!feedback) return null;
  if (feedback.updated) return { text: "La tarjeta se actualizo correctamente.", tone: "success" as const, label: "Actualizada" };
  if (feedback.deleted) return { text: "La tarjeta se borro correctamente.", tone: "success" as const, label: "Borrada" };
  if (feedback.saved) return { text: "La tarjeta se creo correctamente.", tone: "success" as const, label: "Guardada" };
  if (feedback.error === "linked_card") return { text: "No puedes borrar una tarjeta con compras o pagos asociados.", tone: "danger" as const, label: "Bloqueada" };
  if (feedback.error === "balance_card") return { text: "Primero deja el usado actual en cero antes de borrar la tarjeta.", tone: "warning" as const, label: "Saldo usado" };
  if (feedback.error) return { text: "No se pudo completar la accion sobre la tarjeta.", tone: "danger" as const, label: "Error" };
  return null;
}

function WalletMetric({ label, value, accent, muted }: { label: string; value: string; accent: string; muted: string }) {
  return (
    <div>
      <p className={`text-xs uppercase tracking-[0.18em] ${muted}`}>{label}</p>
      <p className={`mt-2 text-lg font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="arca-soft-block rounded-xl px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function getIssuerTheme(issuer: string) {
  const normalized = normalizeCardIssuer(issuer);
  return (
    Object.entries(issuerThemes).find(([key]) => normalized.includes(key))?.[1] ?? {
      shell: "bg-[color:color-mix(in_srgb,var(--accent)_74%,var(--surface)_26%)] text-[var(--on-accent)] border-[color:color-mix(in_srgb,var(--accent)_76%,var(--border)_24%)]",
      accent: "text-[var(--copper-soft)]",
      muted: "text-[color:color-mix(in_srgb,var(--on-accent)_76%,transparent)]",
    }
  );
}
