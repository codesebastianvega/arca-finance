'use client';

import React from 'react';
import { Lightbulb, ShieldAlert, ShieldCheck, Calendar, ArrowRight, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import { haptics } from '@/src/lib/haptics';

export type PurchaseSimulationOutput = {
  success?: boolean;
  currency?: string;
  purchaseDescription?: string;
  totalAmount?: number;
  installments?: number;
  monthlyInstallment?: number;
  currentLiquidity?: number;
  remainingCashAfterMonth1?: number;
  riskLevel?: 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK';
  recommendation?: string;
};

type PurchaseSimulationCardProps = {
  output?: PurchaseSimulationOutput;
  currencyCode?: string;
  onExploreObligations?: () => void;
};

export function PurchaseSimulationCard({
  output,
  currencyCode = 'COP',
  onExploreObligations,
}: PurchaseSimulationCardProps) {
  if (!output) return null;

  const currency = output.currency || currencyCode;
  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  const risk = output.riskLevel ?? 'LOW_RISK';
  const riskBadge =
    risk === 'HIGH_RISK'
      ? { label: 'RIESGO ALTO DE ILIQUIDEZ', bg: 'bg-red-500/15 border-red-500/30 text-red-400', icon: ShieldAlert }
      : risk === 'MODERATE_RISK'
      ? { label: 'RIESGO MODERADO', bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400', icon: Lightbulb }
      : { label: 'COMPRA VIABLE (RIESGO BAJO)', bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', icon: ShieldCheck };

  const RiskIcon = riskBadge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm overflow-hidden rounded-3xl border border-indigo-500/35 bg-arca-surface-1 p-5 shadow-xl text-arca-text-primary"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-arca-border">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Lightbulb size={20} />
          </span>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-400">
              ✦ SIMULADOR "WHAT-IF"
            </span>
            <h4 className="text-sm font-black leading-tight text-arca-text-primary truncate max-w-[200px]">
              {output.purchaseDescription || 'Compra Proyectada'}
            </h4>
          </div>
        </div>
      </div>

      {/* Main Numbers */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-arca-surface-2 p-3 border border-arca-border">
          <p className="text-[9px] font-extrabold uppercase text-arca-text-dim">Monto Total</p>
          <p className="mt-1 text-base font-black text-arca-text-primary">{formatMoney(output.totalAmount ?? 0)}</p>
        </div>
        <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/25 p-3">
          <p className="text-[9px] font-extrabold uppercase text-indigo-400">
            {output.installments ?? 1} Cuotas de
          </p>
          <p className="mt-1 text-base font-black text-indigo-300">
            {formatMoney(output.monthlyInstallment ?? 0)}/mes
          </p>
        </div>
      </div>

      {/* Risk Badge */}
      <div className={`mt-3.5 flex items-center gap-2 rounded-2xl border p-3 text-xs font-extrabold ${riskBadge.bg}`}>
        <RiskIcon size={18} className="shrink-0" />
        <span>{riskBadge.label}</span>
      </div>

      {/* Recommendation */}
      {output.recommendation && (
        <p className="mt-3 text-xs leading-relaxed text-arca-text-secondary bg-arca-surface-2 p-3 rounded-2xl border border-arca-border">
          {output.recommendation}
        </p>
      )}

      {/* Remaining Cash forecast */}
      <div className="mt-3.5 flex items-center justify-between text-xs font-semibold rounded-2xl bg-arca-surface-2 p-3 border border-arca-border">
        <span className="text-arca-text-secondary flex items-center gap-1.5">
          <TrendingDown size={14} className="text-indigo-400" />
          Caja restante tras mes 1:
        </span>
        <span className="font-mono font-bold text-arca-text-primary">
          {formatMoney(output.remainingCashAfterMonth1 ?? 0)}
        </span>
      </div>

      {onExploreObligations && (
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onExploreObligations();
          }}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-arca-surface-2 border border-arca-border text-xs font-bold text-arca-text-primary hover:border-indigo-500/40 active:scale-95 transition-all"
        >
          <span>Ver Compromisos Fijos</span>
          <ArrowRight size={14} />
        </button>
      )}
    </motion.div>
  );
}
