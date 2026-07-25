'use client';

import React from 'react';
import { Bug, Sparkles, CreditCard, ArrowRight, Lightbulb, AlertTriangle, Repeat } from 'lucide-react';
import { motion } from 'motion/react';
import { haptics } from '@/src/lib/haptics';

export type AntExpensesOutput = {
  success?: boolean;
  currency?: string;
  periodDays?: number;
  totalAntExpenses?: number;
  antExpensesCount?: number;
  categoriesList?: Array<{ category: string; amount: number; count: number }>;
  tangibleEquivalence?: string;
  subscriptionsCount?: number;
  subscriptions?: Array<{ id: string; name: string; amount: number; frequency?: string; status?: string }>;
};

type AntExpensesCardProps = {
  output?: AntExpensesOutput;
  currencyCode?: string;
  onExploreSubscriptions?: () => void;
};

export function AntExpensesCard({ output, currencyCode = 'COP', onExploreSubscriptions }: AntExpensesCardProps) {
  if (!output) return null;

  const currency = output.currency || currencyCode;
  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  const total = output.totalAntExpenses ?? 0;
  const count = output.antExpensesCount ?? 0;
  const categories = output.categoriesList ?? [];
  const subscriptions = output.subscriptions ?? [];
  const maxCategoryAmount = Math.max(...categories.map((c) => c.amount), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm overflow-hidden rounded-3xl border border-amber-500/35 bg-arca-surface-1 p-5 shadow-xl text-arca-text-primary"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-arca-border">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Bug size={20} />
          </span>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">
              ✦ ANÁLISIS AGÉNTICO
            </span>
            <h4 className="text-sm font-black leading-tight text-arca-text-primary">
              Gastos Hormiga & Suscripciones
            </h4>
          </div>
        </div>
      </div>

      {/* Main Stat */}
      <div className="mt-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
          Acumulado Últimos {output.periodDays ?? 30} Días
        </p>
        <p className="mt-1 text-2xl font-black text-amber-300">
          {formatMoney(total)}
        </p>
        <p className="mt-0.5 text-xs text-arca-text-secondary">
          En {count} micro-compras (menores a $35.000)
        </p>
      </div>

      {/* Tangible Equivalence Box */}
      {output.tangibleEquivalence && (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-arca-surface-2 p-3 border border-arca-border text-xs text-arca-text-secondary">
          <Lightbulb size={17} className="shrink-0 text-arca-accent mt-0.5" />
          <div>
            <span className="font-bold text-arca-text-primary">Equivalencia Real: </span>
            <span>Tus micro-gastos equivalen a <strong className="text-arca-accent">{output.tangibleEquivalence}</strong>.</span>
          </div>
        </div>
      )}

      {/* Categories Breakdown */}
      {categories.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-arca-text-dim">
            Desglose por Categoría
          </p>
          {categories.slice(0, 4).map((cat) => {
            const pct = Math.round((cat.amount / maxCategoryAmount) * 100);
            return (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-arca-text-primary truncate">{cat.category}</span>
                  <span className="text-arca-text-secondary font-mono">{formatMoney(cat.amount)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-arca-surface-2 border border-arca-border">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-arca-accent rounded-full transition-all"
                    style={{ width: `${Math.max(8, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subscriptions Section */}
      {subscriptions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-arca-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-arca-text-dim flex items-center gap-1">
              <Repeat size={12} className="text-arca-accent" />
              Suscripciones Detectadas ({subscriptions.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {subscriptions.slice(0, 3).map((sub) => (
              <div
                key={sub.id || sub.name}
                className="flex items-center justify-between rounded-xl bg-arca-surface-2 p-2.5 border border-arca-border text-xs"
              >
                <span className="font-bold text-arca-text-primary truncate">{sub.name}</span>
                <span className="font-mono text-arca-accent font-semibold">{formatMoney(sub.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action footer */}
      {onExploreSubscriptions && (
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onExploreSubscriptions();
          }}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-arca-surface-2 border border-arca-border text-xs font-bold text-arca-text-primary hover:border-arca-accent/40 active:scale-95 transition-all"
        >
          <span>Gestionar Suscripciones</span>
          <ArrowRight size={14} />
        </button>
      )}
    </motion.div>
  );
}
