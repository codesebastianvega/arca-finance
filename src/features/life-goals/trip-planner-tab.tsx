'use client';

import React, { useState } from 'react';
import { Plane, Calendar, PiggyBank, Sparkles, Check, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { haptics } from '@/src/lib/haptics';

export function TripPlannerTab() {
  const [destination, setDestination] = useState('San Andrés');
  const [totalBudget, setTotalBudget] = useState(2500000);
  const [months, setMonths] = useState(6);
  const [goalCreated, setGoalCreated] = useState(false);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  const flights = Math.round(totalBudget * 0.35);
  const hotel = Math.round(totalBudget * 0.30);
  const food = Math.round(totalBudget * 0.20);
  const tours = Math.round(totalBudget * 0.15);

  const safeMonths = Math.max(1, months);
  const monthlySavings = Math.round(totalBudget / safeMonths);
  const weeklySavings = Math.round(totalBudget / (safeMonths * 4));

  const handleCreateGoal = () => {
    haptics.medium();
    setGoalCreated(true);
    setTimeout(() => setGoalCreated(false), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Interactive Controls */}
      <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-arca-border">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <Plane size={20} />
          </span>
          <div>
            <h3 className="text-base font-black text-arca-text-primary">Planeador de Viajes</h3>
            <p className="text-xs text-arca-text-dim">Estima tu presupuesto y programa tu ahorro semanal</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-arca-text-dim">Destino</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-surface-2 p-3 text-xs font-bold text-arca-text-primary focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-arca-text-dim">Presupuesto ($)</label>
            <input
              type="number"
              value={totalBudget}
              onChange={(e) => setTotalBudget(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-surface-2 p-3 text-xs font-bold text-arca-text-primary focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-arca-text-dim">Plazo (Meses)</label>
            <input
              type="number"
              min={1}
              max={36}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-surface-2 p-3 text-xs font-bold text-arca-text-primary focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Breakdown Banner */}
      <div className="rounded-3xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-arca-surface-1 to-arca-surface-2 p-5 shadow-xl text-center space-y-3">
        <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
          Ahorro Requerido para {destination}
        </span>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-arca-surface-2/80 p-3 border border-arca-border">
            <p className="text-[9px] font-extrabold uppercase text-arca-text-dim">Mensual</p>
            <p className="mt-1 text-xl font-black text-sky-300">{formatMoney(monthlySavings)}</p>
          </div>
          <div className="rounded-2xl bg-arca-surface-2/80 p-3 border border-arca-border">
            <p className="text-[9px] font-extrabold uppercase text-arca-text-dim">Semanal</p>
            <p className="mt-1 text-xl font-black text-sky-300">{formatMoney(weeklySavings)}</p>
          </div>
        </div>
      </div>

      {/* Categories Breakdown */}
      <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-5 shadow-xl space-y-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-arca-text-dim">
          Desglose Recomendado del Presupuesto
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between rounded-xl bg-arca-surface-2 p-3 border border-arca-border">
            <span className="font-bold text-arca-text-primary">✈️ Tiquetes Aéreos (35%)</span>
            <span className="font-mono font-bold text-sky-400">{formatMoney(flights)}</span>
          </div>
          <div className="flex justify-between rounded-xl bg-arca-surface-2 p-3 border border-arca-border">
            <span className="font-bold text-arca-text-primary">🏨 Hospedaje / Hotel (30%)</span>
            <span className="font-mono font-bold text-sky-400">{formatMoney(hotel)}</span>
          </div>
          <div className="flex justify-between rounded-xl bg-arca-surface-2 p-3 border border-arca-border">
            <span className="font-bold text-arca-text-primary">🍽️ Alimentación y Viáticos (20%)</span>
            <span className="font-mono font-bold text-sky-400">{formatMoney(food)}</span>
          </div>
          <div className="flex justify-between rounded-xl bg-arca-surface-2 p-3 border border-arca-border">
            <span className="font-bold text-arca-text-primary">🏝️ Tours y Compras (15%)</span>
            <span className="font-mono font-bold text-sky-400">{formatMoney(tours)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateGoal}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 text-black font-extrabold text-xs active:scale-95 transition-all shadow-lg shadow-sky-500/20"
        >
          {goalCreated ? (
            <>
              <Check size={16} />
              <span>¡Meta de Ahorro para {destination} Creada!</span>
            </>
          ) : (
            <>
              <PiggyBank size={16} />
              <span>Crear Meta de Ahorro para este Viaje</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
