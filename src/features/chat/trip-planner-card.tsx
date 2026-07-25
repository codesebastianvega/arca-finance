'use client';

import React from 'react';
import { Plane, Calendar, PiggyBank, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { haptics } from '@/src/lib/haptics';

export type TripPlannerOutput = {
  success?: boolean;
  currency?: string;
  destination?: string;
  totalBudget?: number;
  targetMonth?: string;
  monthsToTrip?: number;
  breakdown?: {
    flights: number;
    hotel: number;
    food: number;
    toursAndExtras: number;
  };
  monthlySavingsNeeded?: number;
  weeklySavingsNeeded?: number;
};

type TripPlannerCardProps = {
  output?: TripPlannerOutput;
  currencyCode?: string;
  onOpenLifeGoalsScreen?: () => void;
};

export function TripPlannerCard({
  output,
  currencyCode = 'COP',
  onOpenLifeGoalsScreen,
}: TripPlannerCardProps) {
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
      className="w-full max-w-sm overflow-hidden rounded-3xl border border-sky-500/35 bg-arca-surface-1 p-5 shadow-xl text-arca-text-primary"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-arca-border">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <Plane size={20} />
          </span>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-400">
              ✦ PLANEADOR DE VIAJES
            </span>
            <h4 className="text-sm font-black leading-tight text-arca-text-primary">
              {output.destination || 'Viaje Proyectado'}
            </h4>
          </div>
        </div>
      </div>

      {/* Main Budget Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-arca-surface-2 p-3 border border-arca-border">
          <p className="text-[9px] font-extrabold uppercase text-arca-text-dim">Presupuesto Total</p>
          <p className="mt-1 text-base font-black text-arca-text-primary">{formatMoney(output.totalBudget ?? 0)}</p>
        </div>
        <div className="rounded-2xl bg-sky-500/10 border border-sky-500/25 p-3">
          <p className="text-[9px] font-extrabold uppercase text-sky-400">Ahorro Mensual</p>
          <p className="mt-1 text-base font-black text-sky-300">
            {formatMoney(output.monthlySavingsNeeded ?? 0)}/mes
          </p>
        </div>
      </div>

      {/* Breakdown */}
      {output.breakdown && (
        <div className="mt-4 space-y-1.5 text-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-arca-text-dim">
            Desglose Recomendado
          </p>
          <div className="flex justify-between rounded-xl bg-arca-surface-2 p-2.5 border border-arca-border">
            <span>✈️ Tiquetes</span>
            <span className="font-mono font-bold text-sky-300">{formatMoney(output.breakdown.flights)}</span>
          </div>
          <div className="flex justify-between rounded-xl bg-arca-surface-2 p-2.5 border border-arca-border">
            <span>🏨 Hospedaje</span>
            <span className="font-mono font-bold text-sky-300">{formatMoney(output.breakdown.hotel)}</span>
          </div>
          <div className="flex justify-between rounded-xl bg-arca-surface-2 p-2.5 border border-arca-border">
            <span>🍽️ Comidas</span>
            <span className="font-mono font-bold text-sky-300">{formatMoney(output.breakdown.food)}</span>
          </div>
        </div>
      )}

      {onOpenLifeGoalsScreen && (
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onOpenLifeGoalsScreen();
          }}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-arca-surface-2 border border-arca-border text-xs font-bold text-arca-text-primary hover:border-sky-500/40 active:scale-95 transition-all"
        >
          <span>Ver en Pantalla Completa 📱</span>
          <ArrowRight size={14} />
        </button>
      )}
    </motion.div>
  );
}
