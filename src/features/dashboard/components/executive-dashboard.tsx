"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  ChartNoAxesCombined,
  CircleDollarSign,
  History,
  ReceiptText,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { AnalyticsMonth, AnalyticsViewModel } from "@/src/lib/analytics-types";

type ExecutiveDashboardProps = {
  data: AnalyticsViewModel;
  currency: string;
  onBack: () => void;
  onOpenNova: (prompt: string) => void;
  onOpenMovements: () => void;
};

const PERIODS = [3, 6, 12] as const;

function money(value: number, currency: string) {
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : "COP";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: safeCurrency,
    maximumFractionDigits: 0,
  }).format(value);
}

function compactMoney(value: number, currency: string) {
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : "COP";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: safeCurrency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function hasActivity(month: AnalyticsMonth) {
  return month.income > 0 || month.expenses > 0;
}

export default function ExecutiveDashboard({ data, currency, onBack, onOpenNova, onOpenMovements }: ExecutiveDashboardProps) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(6);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const selectedStart = Math.max(0, data.months.length - period);
  const selectedMonths = data.months.slice(selectedStart);
  const measuredMonths = selectedMonths.filter(hasActivity);
  const hasComparison = measuredMonths.length >= 2;
  const income = selectedMonths.reduce((sum, month) => sum + month.income, 0);
  const expenses = selectedMonths.reduce((sum, month) => sum + month.expenses, 0);
  const net = income - expenses;
  const averageExpenses = measuredMonths.length ? expenses / measuredMonths.length : 0;
  const bestMonth = [...measuredMonths].sort((left, right) => right.net - left.net)[0] ?? null;
  const highestExpenseMonth = [...measuredMonths].sort((left, right) => right.expenses - left.expenses)[0] ?? null;
  const selectedIndexes = new Set(selectedMonths.map((month) => data.months.findIndex((candidate) => candidate.key === month.key)));
  const selectedMonthKeys = new Set(selectedMonths.map((month) => month.key));
  const categoryTotals = data.categories
    .map((category) => ({
      label: category.label,
      amount: category.monthlyAmounts.reduce((sum, amount, index) => selectedIndexes.has(index) ? sum + amount : sum, 0),
      items: category.items.filter((item) => selectedMonthKeys.has(item.monthKey)),
    }))
    .filter((category) => category.amount > 0)
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 5);
  const selectedCategoryDetail = categoryTotals.find((category) => category.label === selectedCategory) ?? null;
  const topCategory = categoryTotals[0];
  const topCategoryShare = expenses > 0 && topCategory ? Math.round((topCategory.amount / expenses) * 100) : 0;
  const insight = !data.hasData
    ? "Todavía no hay movimientos suficientes para construir tu historial."
    : !hasComparison
      ? `Tienes ${measuredMonths.length} ${measuredMonths.length === 1 ? "mes medido" : "meses medidos"} en este periodo. Aún no voy a llamarlo tendencia, pero ya puedo explicarte cómo se distribuyó tu dinero.`
      : topCategory
        ? `${topCategory.label} concentró el ${topCategoryShare}% de tus salidas registradas. Tu balance acumulado fue ${money(net, currency)}.`
        : `Tu balance acumulado en los meses con movimientos fue ${money(net, currency)}.`;

  return (
    <div className="space-y-5 pb-6">
      <header className="flex items-start gap-3">
        <button type="button" onClick={onBack} aria-label="Volver a Más" className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-arca-border bg-arca-surface-1 text-arca-text-dim transition-colors hover:text-arca-accent">
          <ArrowLeft size={19} />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Lo que ya ocurrió</p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-arca-text-primary">Historial financiero</h1>
          <p className="mt-1 text-xs text-arca-text-dim">Datos reales de tus ingresos y salidas registradas.</p>
        </div>
      </header>

      <div className="flex rounded-2xl border border-arca-border bg-arca-surface-1 p-1" role="group" aria-label="Periodo histórico">
        {PERIODS.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => setPeriod(option)}
            aria-pressed={period === option}
            className={`h-9 flex-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${period === option ? "bg-arca-accent text-[#15110c]" : "text-arca-text-dim hover:text-arca-text-primary"}`}
          >
            Últimos {option}
          </button>
        ))}
      </div>

      {!data.hasData ? (
        <section className="rounded-[28px] border border-arca-border-strong bg-arca-surface-1 p-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-arca-accent/10 text-arca-accent"><History size={25} /></span>
          <h2 className="mt-4 text-lg font-black text-arca-text-primary">Tu historial empieza aquí</h2>
          <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-arca-text-secondary">Cuando registres movimientos podremos explicar qué pasó con tu dinero, sin estimaciones ni proyecciones.</p>
          <button type="button" onClick={onOpenMovements} className="mt-5 h-11 w-full rounded-2xl border border-arca-border font-black text-arca-text-primary">Ver movimientos</button>
        </section>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-[28px] border border-arca-border-strong bg-arca-surface-1 p-5">
            <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-arca-accent/[0.08] blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-arca-text-dim">Balance registrado</p>
                  <p className={`mt-2 text-4xl font-black tracking-[-0.055em] ${net >= 0 ? "text-arca-text-primary" : "text-arca-alert"}`}>{money(net, currency)}</p>
                  <p className="mt-2 text-xs text-arca-text-secondary">Ingresos menos salidas durante los últimos {period} meses.</p>
                </div>
                <span className="rounded-full bg-arca-surface-2 px-2.5 py-1 text-[9px] font-black text-arca-text-secondary">
                  {measuredMonths.length} {measuredMonths.length === 1 ? "mes medido" : "meses medidos"}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2.5 border-t border-arca-border pt-4">
                <MetricCard icon={TrendingUp} label="Ingresos" value={compactMoney(income, currency)} tone="positive" />
                <MetricCard icon={TrendingDown} label="Salidas" value={compactMoney(expenses, currency)} tone="alert" />
                <MetricCard icon={CalendarRange} label="Promedio salida" value={compactMoney(averageExpenses, currency)} tone="accent" />
              </div>
            </div>
          </section>

          {hasComparison ? (
            <>
              <section className="rounded-[26px] border border-arca-border bg-arca-surface-1 p-5">
                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-arca-text-dim">Meses con movimientos</p>
                  <h2 className="mt-1 text-base font-black text-arca-text-primary">Ingresos frente a salidas</h2>
                  <p className="mt-1 text-[10px] text-arca-text-secondary">Solo mostramos meses donde registraste actividad.</p>
                </div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={measuredMonths} barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,113,89,0.16)" vertical={false} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#7C7159", fontSize: 10, fontWeight: 700 }} />
                      <Tooltip cursor={{ fill: "rgba(198,138,69,0.05)" }} formatter={(value) => money(Number(value), currency)} contentStyle={{ backgroundColor: "#17130E", border: "1px solid #33291B", borderRadius: 14, fontSize: 11 }} />
                      <Bar dataKey="income" name="Ingresos" fill="#8FA66A" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="expenses" name="Salidas" fill="#C68A45" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3">
                <FactCard label="Mejor balance" month={bestMonth} value={bestMonth ? money(bestMonth.net, currency) : money(0, currency)} tone="positive" />
                <FactCard label="Mayor salida" month={highestExpenseMonth} value={highestExpenseMonth ? money(highestExpenseMonth.expenses, currency) : money(0, currency)} tone="alert" />
              </section>
            </>
          ) : (
            <section className="rounded-[26px] border border-arca-border bg-arca-surface-1 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><ChartNoAxesCombined size={18} /></span>
                <div>
                  <p className="font-black text-arca-text-primary">Aún estamos construyendo tu historial</p>
                  <p className="mt-1 text-xs leading-5 text-arca-text-secondary">
                    {measuredMonths.length
                      ? `Hay ${measuredMonths.length} mes con actividad en este periodo. Mostraremos comparaciones cuando exista al menos otro mes real.`
                      : "No hay meses con actividad en este periodo. Prueba un rango mayor o revisa tus movimientos."}
                  </p>
                </div>
              </div>
              <button type="button" onClick={onOpenMovements} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-arca-border text-xs font-black text-arca-text-primary">
                Revisar movimientos <ArrowRight size={15} />
              </button>
            </section>
          )}

          {categoryTotals.length ? (
            <section className="overflow-hidden rounded-[26px] border border-arca-border bg-arca-surface-1">
              <div className="flex items-end justify-between gap-4 border-b border-arca-border px-5 pb-4 pt-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-arca-text-dim">Distribución de salidas</p>
                  <h2 className="mt-1 text-base font-black text-arca-text-primary">¿En qué salió tu dinero?</h2>
                  <p className="mt-1 text-[10px] text-arca-text-secondary">Categorías registradas · últimos {period} meses</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[8px] font-black uppercase tracking-wider text-arca-text-dim">Total</p>
                  <p className="mt-1 text-sm font-black text-arca-text-primary">{money(expenses, currency)}</p>
                </div>
              </div>
              <div className="space-y-1 p-3">
                {categoryTotals.map((category, index) => {
                  const share = expenses > 0 ? Math.round((category.amount / expenses) * 100) : 0;
                  const isPrimary = index === 0;
                  return (
                    <button
                      type="button"
                      key={category.label}
                      onClick={() => setSelectedCategory(category.label)}
                      aria-label={`Ver movimientos de ${category.label}`}
                      className={`w-full rounded-2xl px-3 py-3 text-left transition-colors hover:bg-arca-surface-2 ${isPrimary ? "bg-arca-accent/[0.07]" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`truncate text-xs font-black ${isPrimary ? "text-arca-text-primary" : "text-arca-text-secondary"}`}>{category.label}</span>
                            {isPrimary ? <span className="rounded-full bg-arca-accent/15 px-2 py-0.5 text-[7px] font-black uppercase tracking-wider text-arca-accent">Principal</span> : null}
                          </div>
                          <p className="mt-1 text-[9px] text-arca-text-dim">{share}% del total de salidas</p>
                        </div>
                        <span className="shrink-0 text-sm font-black text-arca-text-primary">{money(category.amount, currency)}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-arca-surface-3">
                        <div className={`h-full rounded-full ${isPrimary ? "bg-arca-accent" : "bg-arca-accent/65"}`} style={{ width: `${Math.max(4, share)}%` }} />
                      </div>
                      <p className="mt-2 text-[8px] font-bold uppercase tracking-wider text-arca-text-dim">Toca para ver el detalle</p>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      )}

      <aside className="rounded-[24px] border border-arca-accent/25 bg-arca-accent/[0.06] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><Sparkles size={17} /></span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-arca-accent">Nova explica tu historial</p>
            <p className="mt-2 text-xs font-medium leading-5 text-arca-text-secondary">{insight}</p>
          </div>
        </div>
        <button type="button" onClick={() => onOpenNova(`Analiza únicamente mi historial real de los últimos ${period} meses. He registrado ${money(income, currency)} en ingresos y ${money(expenses, currency)} en salidas. Explícame qué ocurrió, qué categorías cambiaron y qué movimientos debería revisar; no hagas proyecciones futuras.`)} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-xs font-black text-[#15110c]">
          Explícame lo que pasó <ArrowRight size={16} />
        </button>
      </aside>

      <AnimatePresence>
        {selectedCategoryDetail ? (
          <div className="fixed inset-0 z-[650] flex items-end justify-center">
            <motion.button
              type="button"
              aria-label="Cerrar detalle de categoría"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCategory(null)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            />
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="category-detail-title"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 290 }}
              className="relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] border-t border-arca-border-strong bg-arca-surface-1 shadow-2xl"
            >
              <div className="border-b border-arca-border px-5 pb-4 pt-3">
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-arca-border" />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-accent">Detalle de salidas</p>
                    <h2 id="category-detail-title" className="mt-1 truncate text-xl font-black text-arca-text-primary">{selectedCategoryDetail.label}</h2>
                    <p className="mt-1 text-[10px] text-arca-text-secondary">{selectedCategoryDetail.items.length} {selectedCategoryDetail.items.length === 1 ? "movimiento" : "movimientos"} · últimos {period} meses</p>
                  </div>
                  <button type="button" onClick={() => setSelectedCategory(null)} aria-label="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-arca-border bg-arca-surface-2 text-arca-text-secondary">
                    <X size={18} />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-arca-accent/[0.07] px-4 py-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-arca-text-dim">Total de la categoría</span>
                  <span className="text-lg font-black text-arca-text-primary">{money(selectedCategoryDetail.amount, currency)}</span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
                {selectedCategoryDetail.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 border-b border-arca-border py-4 last:border-0">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><ReceiptText size={16} /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-arca-text-primary">{item.concept}</p>
                        <p className="mt-1 text-[10px] text-arca-text-secondary">{item.dateLabel}</p>
                        <p className="mt-1 text-[9px] text-arca-text-dim">{item.kindLabel}{item.accountName ? ` · ${item.accountName}` : " · Sin cuenta asociada"}</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-black text-arca-text-primary">{money(item.amount, currency)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-arca-border bg-arca-surface-1 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    onOpenMovements();
                  }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-xs font-black text-[#15110c]"
                >
                  Ver todos los movimientos <ArrowRight size={15} />
                </button>
              </div>
            </motion.section>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof CircleDollarSign; label: string; value: string; tone: "positive" | "alert" | "accent" }) {
  const toneClass = tone === "positive" ? "text-arca-positive" : tone === "alert" ? "text-arca-alert" : "text-arca-accent";
  return (
    <div className="min-w-0">
      <Icon size={14} className={toneClass} />
      <p className="mt-2 truncate text-[8px] font-black uppercase tracking-wider text-arca-text-dim">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-arca-text-primary">{value}</p>
    </div>
  );
}

function FactCard({ label, month, value, tone }: { label: string; month: AnalyticsMonth | null; value: string; tone: "positive" | "alert" }) {
  return (
    <div className="rounded-[22px] border border-arca-border bg-arca-surface-1 p-4">
      <p className="text-[9px] font-black uppercase tracking-wider text-arca-text-dim">{label}</p>
      <p className="mt-3 text-sm font-black text-arca-text-primary">{month?.label ?? "Sin datos"}</p>
      <p className={`mt-1 text-xs font-black ${tone === "positive" ? "text-arca-positive" : "text-arca-alert"}`}>{value}</p>
    </div>
  );
}
