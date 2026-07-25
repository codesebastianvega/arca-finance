'use client';

import React from 'react';
import { Home, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { haptics } from '@/src/lib/haptics';

export type HomePurchaseOutput = {
  success?: boolean;
  currency?: string;
  propertyValue?: number;
  isVis?: boolean;
  totalDownPayment?: number;
  estimatedSubsidies?: number;
  netDownPaymentNeeded?: number;
  savingsMonths?: number;
  monthlySavingsNeeded?: number;
  financedAmount?: number;
  estimatedMortgageQuota?: number;
};

type HomePurchaseCardProps = {
  output?: HomePurchaseOutput;
  currencyCode?: string;
  onOpenLifeGoalsScreen?: () => void;
};

export function HomePurchaseCard({
  output,
  currencyCode = 'COP',
  onOpenLifeGoalsScreen,
}: HomePurchaseCardProps) {
  if (!output) return null;

  const currency = output.currency || currencyCode;
  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'COP',
      maximumFractionDigits: 0,
    }).format(val);

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
            <Home size={20} />
          </span>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400">
              ✦ CALCULADORA VIVIENDA (COLOMBIA)
            </span>
            <h4 className="text-sm font-black leading-tight text-arca-text-primary">
              {output.isVis ? 'Vivienda VIS (Con Subsidio)' : 'Vivienda No-VIS'}
            </h4>
          </div>
        </div>
      </div>

      {/* Main Stat Banner */}
      <div className="mt-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4 text-center">
        <p className="text-[10px] font-extrabold uppercase text-emerald-400">Cuota Inicial Neta a Ahorrar</p>
        <p className="mt-1 text-2xl font-black text-emerald-300">
          {formatMoney(output.netDownPaymentNeeded ?? 0)}
        </p>
        <p className="mt-0.5 text-xs text-arca-text-secondary">
          {formatMoney(output.monthlySavingsNeeded ?? 0)}/mes durante {output.savingsMonths ?? 24} meses
        </p>
      </div>

      {/* Details */}
      <div className="mt-3.5 space-y-1.5 text-xs">
        <div className="flex justify-between rounded-xl bg-arca-surface-2 p-2.5 border border-arca-border">
          <span>Valor Inmueble</span>
          <span className="font-mono font-bold text-arca-text-primary">{formatMoney(output.propertyValue ?? 0)}</span>
        </div>
        {output.isVis && (
          <div className="flex justify-between rounded-xl bg-emerald-500/10 p-2.5 border border-emerald-500/30">
            <span className="text-emerald-400 font-semibold">Subsidios Est. (Mi Casa / Caja)</span>
            <span className="font-mono font-bold text-emerald-300">-{formatMoney(output.estimatedSubsidies ?? 0)}</span>
          </div>
        )}
        <div className="flex justify-between rounded-xl bg-arca-surface-2 p-2.5 border border-arca-border">
          <span>Crédito Est. (15 años)</span>
          <span className="font-mono font-bold text-emerald-400">{formatMoney(output.estimatedMortgageQuota ?? 0)}/mes</span>
        </div>
      </div>

      {onOpenLifeGoalsScreen && (
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onOpenLifeGoalsScreen();
          }}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-arca-surface-2 border border-arca-border text-xs font-bold text-arca-text-primary hover:border-emerald-500/40 active:scale-95 transition-all"
        >
          <span>Ver en Pantalla Completa 📱</span>
          <ArrowRight size={14} />
        </button>
      )}
    </motion.div>
  );
}
