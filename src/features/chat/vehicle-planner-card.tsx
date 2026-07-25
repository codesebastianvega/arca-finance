'use client';

import React from 'react';
import { Car, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { haptics } from '@/src/lib/haptics';

export type VehiclePlannerOutput = {
  success?: boolean;
  currency?: string;
  vehicleName?: string;
  vehicleType?: string;
  totalAnnualCost?: number;
  monthlyProvision?: number;
  obligations?: Array<{ name: string; month: string; estimatedCost: number }>;
};

type VehiclePlannerCardProps = {
  output?: VehiclePlannerOutput;
  currencyCode?: string;
  onOpenLifeGoalsScreen?: () => void;
};

export function VehiclePlannerCard({
  output,
  currencyCode = 'COP',
  onOpenLifeGoalsScreen,
}: VehiclePlannerCardProps) {
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
      className="w-full max-w-sm overflow-hidden rounded-3xl border border-amber-500/35 bg-arca-surface-1 p-5 shadow-xl text-arca-text-primary"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-arca-border">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Car size={20} />
          </span>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">
              ✦ GESTOR VEHICULAR & SOAT
            </span>
            <h4 className="text-sm font-black leading-tight text-arca-text-primary">
              {output.vehicleName || 'Mi Vehículo'}
            </h4>
          </div>
        </div>
      </div>

      {/* Main Banner */}
      <div className="mt-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 text-center">
        <p className="text-[10px] font-extrabold uppercase text-amber-400">Cuota Mensual de Previsión</p>
        <p className="mt-1 text-2xl font-black text-amber-300">
          {formatMoney(output.monthlyProvision ?? 0)}/mes
        </p>
        <p className="mt-0.5 text-xs text-arca-text-secondary">
          Total Anual: {formatMoney(output.totalAnnualCost ?? 0)}
        </p>
      </div>

      {/* Obligations List */}
      {output.obligations && (
        <div className="mt-3.5 space-y-1.5 text-xs">
          {output.obligations.map((obl) => (
            <div key={obl.name} className="flex justify-between rounded-xl bg-arca-surface-2 p-2.5 border border-arca-border">
              <span>{obl.name} ({obl.month})</span>
              <span className="font-mono font-bold text-amber-300">{formatMoney(obl.estimatedCost)}</span>
            </div>
          ))}
        </div>
      )}

      {onOpenLifeGoalsScreen && (
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onOpenLifeGoalsScreen();
          }}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-arca-surface-2 border border-arca-border text-xs font-bold text-arca-text-primary hover:border-amber-500/40 active:scale-95 transition-all"
        >
          <span>Ver en Pantalla Completa 📱</span>
          <ArrowRight size={14} />
        </button>
      )}
    </motion.div>
  );
}
