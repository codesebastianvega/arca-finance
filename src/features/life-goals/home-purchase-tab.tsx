'use client';

import React, { useState } from 'react';
import { Home, ShieldCheck, Calculator, Check, ArrowRight, PiggyBank } from 'lucide-react';
import { motion } from 'motion/react';
import { haptics } from '@/src/lib/haptics';

export function HomePurchaseTab() {
  const [propertyValue, setPropertyValue] = useState(200000000);
  const [isVis, setIsVis] = useState(true);
  const [savingsMonths, setSavingsMonths] = useState(24);
  const [planCreated, setPlanCreated] = useState(false);

  const smmlv = 1400000;
  const totalDownPayment = Math.round(propertyValue * 0.30);
  const estimatedSubsidies = isVis ? 30 * smmlv : 0;
  const netDownPaymentNeeded = Math.max(0, totalDownPayment - estimatedSubsidies);
  const safeMonths = Math.max(1, savingsMonths);
  const monthlySavingsNeeded = Math.round(netDownPaymentNeeded / safeMonths);

  const financedAmount = propertyValue - totalDownPayment;
  const estimatedMortgageQuota = Math.round(financedAmount * 0.011);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  const handleCreatePlan = () => {
    haptics.medium();
    setPlanCreated(true);
    setTimeout(() => setPlanCreated(false), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-arca-border">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Home size={20} />
          </span>
          <div>
            <h3 className="text-base font-black text-arca-text-primary">Calculadora de Vivienda & Subsidios</h3>
            <p className="text-xs text-arca-text-dim">Subsidios Mi Casa Ya + Caja de Compensación en Colombia</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-arca-text-dim">Valor Inmueble ($)</label>
            <input
              type="number"
              step={5000000}
              value={propertyValue}
              onChange={(e) => setPropertyValue(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-surface-2 p-3 text-xs font-bold text-arca-text-primary focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-arca-text-dim">Tipo Vivienda</label>
            <select
              value={isVis ? 'vis' : 'novis'}
              onChange={(e) => setIsVis(e.target.value === 'vis')}
              className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-surface-2 p-3 text-xs font-bold text-arca-text-primary focus:border-emerald-500 focus:outline-none"
            >
              <option value="vis">🏠 VIS (Aplica Subsidio)</option>
              <option value="novis">🏢 No-VIS (&gt; 150 SMMLV)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-arca-text-dim">Plazo Cuota Inicial</label>
            <select
              value={savingsMonths}
              onChange={(e) => setSavingsMonths(Number(e.target.value) || 24)}
              className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-surface-2 p-3 text-xs font-bold text-arca-text-primary focus:border-emerald-500 focus:outline-none"
            >
              <option value={12}>12 Meses (1 Año)</option>
              <option value={24}>24 Meses (2 Años)</option>
              <option value={36}>36 Meses (3 Años)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Results Grid */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-[9px] font-black uppercase text-emerald-400">Cuota Inicial Neta Requerida</p>
          <p className="mt-1 text-xl font-black text-emerald-300">{formatMoney(netDownPaymentNeeded)}</p>
          <p className="mt-0.5 text-[10px] text-arca-text-dim">Tras subsidios de {formatMoney(estimatedSubsidies)}</p>
        </div>

        <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-4">
          <p className="text-[9px] font-black uppercase text-arca-text-dim">Ahorro Mensual Requerido</p>
          <p className="mt-1 text-xl font-black text-arca-text-primary">{formatMoney(monthlySavingsNeeded)}/mes</p>
          <p className="mt-0.5 text-[10px] text-arca-text-dim">Durante {safeMonths} meses</p>
        </div>
      </div>

      {/* Financial Details */}
      <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-5 shadow-xl space-y-3 text-xs">
        <p className="text-[10px] font-black uppercase tracking-wider text-arca-text-dim">
          Resumen Financiero del Inmueble
        </p>

        <div className="space-y-2">
          <div className="flex justify-between rounded-xl bg-arca-surface-2 p-3 border border-arca-border">
            <span className="font-bold text-arca-text-primary">Cuota Inicial Total (30%)</span>
            <span className="font-mono font-bold text-arca-text-primary">{formatMoney(totalDownPayment)}</span>
          </div>

          {isVis && (
            <div className="flex justify-between rounded-xl bg-emerald-500/10 p-3 border border-emerald-500/30">
              <span className="font-bold text-emerald-400">Subsidios Est. (Mi Casa Ya / Caja)</span>
              <span className="font-mono font-bold text-emerald-300">-{formatMoney(estimatedSubsidies)}</span>
            </div>
          )}

          <div className="flex justify-between rounded-xl bg-arca-surface-2 p-3 border border-arca-border">
            <span className="font-bold text-arca-text-primary">Monto a Financiar Crédito Hipotecario (70%)</span>
            <span className="font-mono font-bold text-arca-text-primary">{formatMoney(financedAmount)}</span>
          </div>

          <div className="flex justify-between rounded-xl bg-arca-surface-2 p-3 border border-arca-border">
            <span className="font-bold text-arca-text-primary">Cuota Mensual Crédito Est. (15 años)</span>
            <span className="font-mono font-bold text-emerald-400">{formatMoney(estimatedMortgageQuota)}/mes</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreatePlan}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-black font-extrabold text-xs active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
        >
          {planCreated ? (
            <>
              <Check size={16} />
              <span>¡Plan de Cuota Inicial Guardado!</span>
            </>
          ) : (
            <>
              <PiggyBank size={16} />
              <span>Guardar Plan de Ahorro para Cuota Inicial</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
