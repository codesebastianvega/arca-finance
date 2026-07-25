'use client';

import React, { useState } from 'react';
import { Target, Flame, Snowflake, Calendar, ArrowRight, CheckCircle2, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { haptics } from '@/src/lib/haptics';

export type DebtPayoffOutput = {
  success?: boolean;
  currency?: string;
  totalDebtBalance?: number;
  totalMinPayment?: number;
  monthlyExtraBudget?: number;
  debtsCount?: number;
  estimatedMonthsToFreedom?: number;
  estimatedFreedomDate?: string;
  avalanchePlan?: Array<{ id: string; name: string; type: string; balance: number; interestRateEA: number; minPayment: number }>;
  snowballPlan?: Array<{ id: string; name: string; type: string; balance: number; interestRateEA: number; minPayment: number }>;
};

type DebtSnowballCardProps = {
  output?: DebtPayoffOutput;
  currencyCode?: string;
  onExploreObligations?: () => void;
};

export function DebtSnowballCard({
  output,
  currencyCode = 'COP',
  onExploreObligations,
}: DebtSnowballCardProps) {
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');

  if (!output) return null;

  const currency = output.currency || currencyCode;
  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  const debtsList = strategy === 'avalanche' ? output.avalanchePlan ?? [] : output.snowballPlan ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-500/35 bg-arca-surface-1 p-5 shadow-xl text-arca-text-primary"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-arca-border">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Target size={20} />
          </span>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400">
              ✦ PLAN DE AMORTIZACIÓN
            </span>
            <h4 className="text-sm font-black leading-tight text-arca-text-primary">
              Acelerador Cero Deudas
            </h4>
          </div>
        </div>
      </div>

      {/* Main freedom banner */}
      <div className="mt-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase text-emerald-400">
          <Award size={16} />
          <span>Libertad de Deudas Proyectada</span>
        </div>
        <p className="mt-1 text-2xl font-black text-emerald-300">
          {output.estimatedFreedomDate || '8 Meses'}
        </p>
        <p className="mt-0.5 text-xs text-arca-text-secondary">
          En ~{output.estimatedMonthsToFreedom ?? 8} meses pagando {formatMoney((output.totalMinPayment ?? 0) + (output.monthlyExtraBudget ?? 0))}/mes
        </p>
      </div>

      {/* Strategy Switcher */}
      <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-arca-surface-2 p-1 border border-arca-border text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            haptics.light();
            setStrategy('avalanche');
          }}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all ${
            strategy === 'avalanche'
              ? 'bg-emerald-500 text-black shadow-md'
              : 'text-arca-text-secondary hover:text-arca-text-primary'
          }`}
        >
          <Flame size={14} />
          <span>Avalancha (%)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.light();
            setStrategy('snowball');
          }}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all ${
            strategy === 'snowball'
              ? 'bg-emerald-500 text-black shadow-md'
              : 'text-arca-text-secondary hover:text-arca-text-primary'
          }`}
        >
          <Snowflake size={14} />
          <span>Bola Nieve ($)</span>
        </button>
      </div>

      {/* Strategy Explanation */}
      <p className="mt-2.5 text-[11px] leading-relaxed text-arca-text-secondary px-1">
        {strategy === 'avalanche'
          ? '🔥 Avalancha: Ataca primero la deuda con mayor tasa de interés (ahorro máximo de dinero).'
          : '❄️ Bola de Nieve: Ataca primero el saldo más pequeño (victorias psicológicas rápidas).'}
      </p>

      {/* Debt Priority List */}
      <div className="mt-3.5 space-y-2">
        {debtsList.slice(0, 3).map((debt, index) => (
          <div
            key={debt.id || debt.name}
            className="flex items-center justify-between rounded-2xl bg-arca-surface-2 p-3 border border-arca-border text-xs"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                #{index + 1}
              </span>
              <div>
                <p className="font-bold text-arca-text-primary truncate max-w-[120px]">{debt.name}</p>
                <p className="text-[10px] text-arca-text-dim">{debt.type} • {debt.interestRateEA}% EA</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-arca-text-primary">{formatMoney(debt.balance)}</p>
              <p className="text-[10px] text-emerald-400 font-medium">Cuota: {formatMoney(debt.minPayment)}</p>
            </div>
          </div>
        ))}
      </div>

      {onExploreObligations && (
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onExploreObligations();
          }}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-arca-surface-2 border border-arca-border text-xs font-bold text-arca-text-primary hover:border-emerald-500/40 active:scale-95 transition-all"
        >
          <span>Ir a Centro de Deudas</span>
          <ArrowRight size={14} />
        </button>
      )}
    </motion.div>
  );
}
