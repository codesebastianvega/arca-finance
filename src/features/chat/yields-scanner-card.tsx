'use client';

import React from 'react';
import { TrendingUp, Sparkles, ShieldCheck, ArrowRight, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { haptics } from '@/src/lib/haptics';

export type YieldsScannerOutput = {
  success?: boolean;
  currency?: string;
  evaluatedAmount?: number;
  bestOptionEntity?: string;
  bestOptionRate?: number;
  monthlyGainEstimate?: number;
  annualGainEstimate?: number;
  options?: Array<{
    entity: string;
    product: string;
    eaRate: number;
    liquidity: string;
    riskLevel: string;
  }>;
};

type YieldsScannerCardProps = {
  output?: YieldsScannerOutput;
  currencyCode?: string;
  onExploreAccounts?: () => void;
};

export function YieldsScannerCard({
  output,
  currencyCode = 'COP',
  onExploreAccounts,
}: YieldsScannerCardProps) {
  if (!output) return null;

  const currency = output.currency || currencyCode;
  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  const amount = output.evaluatedAmount ?? 0;
  const options = output.options ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm overflow-hidden rounded-3xl border border-cyan-500/35 bg-arca-surface-1 p-5 shadow-xl text-arca-text-primary"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-arca-border">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <TrendingUp size={20} />
          </span>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-400">
              ✦ ESCÁNER DE RENDIMIENTOS (COLOMBIA)
            </span>
            <h4 className="text-sm font-black leading-tight text-arca-text-primary">
              Rentabilidad de Dinero Libre
            </h4>
          </div>
        </div>
      </div>

      {/* Main Gain Banner */}
      <div className="mt-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 p-4 text-center">
        <p className="text-[10px] font-extrabold uppercase text-cyan-400">
          Ganancia Estimada con tu Dinero Libre ({formatMoney(amount)})
        </p>
        <p className="mt-1 text-2xl font-black text-cyan-300">
          +{formatMoney(output.monthlyGainEstimate ?? 0)}/mes
        </p>
        <p className="mt-0.5 text-xs text-arca-text-secondary">
          (+{formatMoney(output.annualGainEstimate ?? 0)} al año al {output.bestOptionRate ?? 13}% EA)
        </p>
      </div>

      {/* Options List */}
      {options.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-arca-text-dim">
            Comparador Neobancos & Inversiones Líquidas
          </p>
          {options.map((opt) => (
            <div
              key={opt.entity}
              className="flex items-center justify-between rounded-2xl bg-arca-surface-2 p-3 border border-arca-border text-xs"
            >
              <div>
                <p className="font-bold text-arca-text-primary">{opt.entity}</p>
                <p className="text-[10px] text-arca-text-dim">{opt.product}</p>
              </div>
              <div className="text-right">
                <span className="inline-block rounded-full bg-cyan-500/20 px-2.5 py-0.5 font-mono font-extrabold text-cyan-300 text-xs">
                  {opt.eaRate}% EA
                </span>
                <p className="mt-0.5 text-[9px] text-arca-text-dim">{opt.liquidity}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {onExploreAccounts && (
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onExploreAccounts();
          }}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-arca-surface-2 border border-arca-border text-xs font-bold text-arca-text-primary hover:border-cyan-500/40 active:scale-95 transition-all"
        >
          <span>Ver mis Cuentas</span>
          <ArrowRight size={14} />
        </button>
      )}
    </motion.div>
  );
}
