'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Flame,
  Snowflake,
  Plus,
  Trash2,
  TrendingDown,
  CheckCircle2,
  Calendar,
  DollarSign,
  Trophy,
} from 'lucide-react';
import { haptics } from '@/src/lib/haptics';

interface DeudaItem {
  id: string;
  name: string;
  balance: number;
  interestRate: number; // tasa mensual %
  minimumPayment: number;
}

interface PayoffResult {
  id: string;
  name: string;
  payoffMonth: number;
  totalPaid: number;
  totalInterest: number;
}

interface SimResult {
  payoffs: PayoffResult[];
  totalMonths: number;
  totalInterestPaid: number;
  totalPaid: number;
}

function money(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

function monthsToText(months: number) {
  if (months <= 0) return '0 meses';
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y > 0) parts.push(`${y} año${y > 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} mes${m > 1 ? 'es' : ''}`);
  return parts.join(' y ');
}

function simulate(debts: DeudaItem[], strategy: 'snowball' | 'avalanche', extraPayment: number): SimResult {
  if (debts.length === 0) return { payoffs: [], totalMonths: 0, totalInterestPaid: 0, totalPaid: 0 };

  // Sort according to strategy
  const sorted = [...debts].sort((a, b) =>
    strategy === 'snowball' ? a.balance - b.balance : b.interestRate - a.interestRate
  );

  // Working balances
  let balances = sorted.map((d) => ({ ...d, remaining: d.balance, paidOff: false }));
  const payoffs: PayoffResult[] = sorted.map((d) => ({ id: d.id, name: d.name, payoffMonth: 0, totalPaid: 0, totalInterest: 0 }));
  let month = 0;
  const maxMonths = 600; // 50 years safety cap

  while (balances.some((b) => !b.paidOff) && month < maxMonths) {
    month++;

    // Find the current target debt (first not paid off, in strategy order)
    const targetIdx = balances.findIndex((b) => !b.paidOff);

    for (let i = 0; i < balances.length; i++) {
      const d = balances[i];
      if (d.paidOff) continue;

      // Accrue interest
      const interest = d.remaining * (d.interestRate / 100);
      d.remaining += interest;
      payoffs[i].totalInterest += interest;

      // Determine this month's payment
      let payment = d.minimumPayment;
      if (i === targetIdx) {
        payment += extraPayment;
      }
      payment = Math.min(payment, d.remaining);

      d.remaining -= payment;
      payoffs[i].totalPaid += payment;

      if (d.remaining <= 0) {
        d.remaining = 0;
        d.paidOff = true;
        payoffs[i].payoffMonth = month;

        // Cascade freed minimum payment to next target
        const freedPayment = d.minimumPayment;
        const nextTarget = balances.findIndex((b, idx) => idx > i && !b.paidOff);
        // (extra payment already flows automatically since targetIdx changes next iteration)
        // Freed minimum goes into extraPayment pool for next months
        // (simplified: add to next target's minimum so snowball grows)
        if (nextTarget !== -1) {
          balances[nextTarget].minimumPayment += freedPayment;
        }
      }
    }
  }

  const totalInterestPaid = payoffs.reduce((s, p) => s + p.totalInterest, 0);
  const totalPaid = payoffs.reduce((s, p) => s + p.totalPaid, 0);
  const totalMonths = Math.max(...payoffs.map((p) => p.payoffMonth));

  return { payoffs, totalMonths, totalInterestPaid, totalPaid };
}

const DEFAULT_DEBTS: DeudaItem[] = [
  { id: '1', name: 'Tarjeta Crédito Banco X', balance: 1500000, interestRate: 2.5, minimumPayment: 80000 },
  { id: '2', name: 'Préstamo Libre Inversión', balance: 4500000, interestRate: 1.8, minimumPayment: 150000 },
  { id: '3', name: 'Crédito Falabella', balance: 600000, interestRate: 2.8, minimumPayment: 50000 },
];

export default function SimuladorDeudasScreen({ onBack }: { onBack: () => void }) {
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball');
  const [extraPayment, setExtraPayment] = useState<number>(200000);
  const [debts, setDebts] = useState<DeudaItem[]>(DEFAULT_DEBTS);

  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newMin, setNewMin] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const simCurrent = useMemo(() => simulate(debts, strategy, extraPayment), [debts, strategy, extraPayment]);
  const simSnowball = useMemo(() => simulate(debts, 'snowball', extraPayment), [debts, extraPayment]);
  const simAvalanche = useMemo(() => simulate(debts, 'avalanche', extraPayment), [debts, extraPayment]);

  const interestSaved = Math.abs(simSnowball.totalInterestPaid - simAvalanche.totalInterestPaid);
  const avalancheFaster = simAvalanche.totalMonths < simSnowball.totalMonths;
  const monthsDiff = Math.abs(simSnowball.totalMonths - simAvalanche.totalMonths);

  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinimums = debts.reduce((s, d) => s + d.minimumPayment, 0);

  const addDebt = () => {
    if (!newName.trim() || !newBalance) return;
    haptics.light();
    setDebts((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: newName.trim(),
        balance: Number(newBalance) || 0,
        interestRate: Number(newRate) || 0,
        minimumPayment: Number(newMin) || 0,
      },
    ]);
    setNewName('');
    setNewBalance('');
    setNewRate('');
    setNewMin('');
    setShowAddForm(false);
  };

  const removeDebt = (id: string) => {
    haptics.light();
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  // Sorted debts for display
  const sortedDebts = [...debts].sort((a, b) =>
    strategy === 'snowball' ? a.balance - b.balance : b.interestRate - a.interestRate
  );

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-arca-border bg-arca-surface-1 text-arca-text-secondary hover:text-arca-text-primary"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Libertad Financiera</p>
          <h2 className="text-xl font-black text-arca-text-primary">Simulador de Deudas</h2>
        </div>
        <div className="w-10" />
      </div>

      {/* Totals + Extra payment */}
      <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-arca-text-dim">Deuda Total</p>
            <p className="text-2xl font-black text-red-400">{money(totalBalance)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-arca-text-dim">Pagos Mínimos/mes</p>
            <p className="text-lg font-black text-arca-text-primary">{money(totalMinimums)}</p>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-arca-text-dim">
            💰 Abono Extra Mensual Disponible (cuánto más puedes pagar)
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-2xl border border-arca-border bg-arca-base px-4 py-2.5 text-base font-bold text-arca-text-primary focus:border-arca-accent focus:outline-none"
            />
          </div>
          <div className="mt-2 flex gap-2">
            {[50000, 100000, 200000, 500000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setExtraPayment(amt)}
                className={`rounded-xl px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                  extraPayment === amt
                    ? 'bg-arca-accent text-[#15110c]'
                    : 'bg-arca-surface-2 text-arca-text-secondary hover:text-arca-text-primary'
                }`}
              >
                +{(amt / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Strategy Comparison Banner */}
      {debts.length > 0 && (
        <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-4 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-arca-text-dim">
            📊 Comparativa de Estrategias
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { haptics.medium(); setStrategy('snowball'); }}
              className={`flex flex-col rounded-2xl border p-3 text-left transition-all ${
                strategy === 'snowball'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-arca-border bg-arca-base'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Snowflake size={16} className="text-cyan-400" />
                <span className="text-xs font-black text-cyan-400">Bola de Nieve ⛄</span>
              </div>
              <p className="text-[10px] text-arca-text-dim mb-1">Menor saldo primero</p>
              <p className="text-sm font-black text-arca-text-primary">{monthsToText(simSnowball.totalMonths)}</p>
              <p className="text-[10px] text-red-400 font-semibold mt-0.5">Intereses: {money(simSnowball.totalInterestPaid)}</p>
              {strategy === 'snowball' && (
                <span className="mt-1 self-start rounded-full bg-cyan-500/20 px-2 py-0.5 text-[9px] font-bold text-cyan-400">Activa ✓</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { haptics.medium(); setStrategy('avalanche'); }}
              className={`flex flex-col rounded-2xl border p-3 text-left transition-all ${
                strategy === 'avalanche'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-arca-border bg-arca-base'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Flame size={16} className="text-amber-400" />
                <span className="text-xs font-black text-amber-400">Avalancha 🔥</span>
              </div>
              <p className="text-[10px] text-arca-text-dim mb-1">Mayor tasa primero</p>
              <p className="text-sm font-black text-arca-text-primary">{monthsToText(simAvalanche.totalMonths)}</p>
              <p className="text-[10px] text-red-400 font-semibold mt-0.5">Intereses: {money(simAvalanche.totalInterestPaid)}</p>
              {strategy === 'avalanche' && (
                <span className="mt-1 self-start rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-400">Activa ✓</span>
              )}
            </button>
          </div>

          {interestSaved > 0 && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
              <p className="text-[10px] font-bold uppercase text-emerald-400">
                {avalancheFaster
                  ? `🏆 Avalancha ahorra ${money(interestSaved)} en intereses y termina ${monthsToText(monthsDiff)} antes`
                  : `⛄ Bola de Nieve ofrece más motivación (Avalancha ahorra ${money(interestSaved)} en intereses)`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Payoff Timeline */}
      {simCurrent.payoffs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-arca-text-dim">
            📅 Línea de Tiempo de Liberación ({strategy === 'snowball' ? 'Bola de Nieve' : 'Avalancha'})
          </h3>
          {simCurrent.payoffs
            .slice()
            .sort((a, b) => a.payoffMonth - b.payoffMonth)
            .map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                  idx === 0
                    ? 'border-emerald-500/50 bg-emerald-500/10 shadow-md'
                    : 'border-arca-border bg-arca-surface-1'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl font-black text-xs ${
                      idx === 0 ? 'bg-emerald-500 text-black' : 'bg-arca-surface-2 text-arca-accent'
                    }`}
                  >
                    {idx === 0 ? <Trophy size={16} /> : `#${idx + 1}`}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-arca-text-primary">{p.name}</p>
                    <p className="text-[10px] text-arca-text-dim">
                      Intereses pagados: <span className="text-red-400 font-semibold">{money(p.totalInterest)}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-400">{monthsToText(p.payoffMonth)}</p>
                  <p className="text-[10px] text-arca-text-dim">Total pagado: {money(p.totalPaid)}</p>
                </div>
              </div>
            ))}

          {/* Final Freedom Date */}
          <div className="rounded-3xl border border-arca-accent/30 bg-arca-accent/5 p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-arca-accent">
              🎉 Libertad Financiera Total
            </p>
            <p className="mt-1 text-2xl font-black text-arca-text-primary">{monthsToText(simCurrent.totalMonths)}</p>
            <p className="text-xs text-arca-text-dim mt-0.5">
              Total pagado: {money(simCurrent.totalPaid)} | Intereses: {money(simCurrent.totalInterestPaid)}
            </p>
          </div>
        </div>
      )}

      {/* Debt List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-arca-text-dim">
            Mis Deudas y Créditos ({debts.length})
          </h3>
          <button
            type="button"
            onClick={() => { haptics.light(); setShowAddForm(!showAddForm); }}
            className="flex items-center gap-1 rounded-2xl bg-arca-accent/15 px-3 py-1.5 text-xs font-bold text-arca-accent hover:bg-arca-accent/25"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>

        {debts.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-2xl border border-arca-border bg-arca-surface-1 px-4 py-3">
            <div>
              <p className="text-xs font-bold text-arca-text-primary">{d.name}</p>
              <p className="text-[10px] text-arca-text-dim">
                Saldo: <span className="text-red-400 font-semibold">{money(d.balance)}</span> · Tasa {d.interestRate}%/mes · Mín. {money(d.minimumPayment)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeDebt(d.id)}
              className="text-arca-text-dim hover:text-red-400 p-1 ml-2"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="rounded-3xl border border-arca-accent/30 bg-arca-surface-1 p-4 space-y-3"
          >
            <h4 className="text-xs font-black text-arca-text-primary">+ Nueva Deuda / Tarjeta</h4>
            <input
              type="text"
              placeholder="Nombre (ej: Tarjeta BBVA, Préstamo Libre)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-2xl border border-arca-border bg-arca-base px-3 py-2 text-xs text-arca-text-primary focus:outline-none focus:border-arca-accent"
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-arca-text-dim font-semibold">Saldo pendiente</label>
                <input type="number" placeholder="COP" value={newBalance} onChange={(e) => setNewBalance(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-base px-3 py-2 text-xs text-arca-text-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-arca-text-dim font-semibold">Tasa mensual %</label>
                <input type="number" placeholder="ej: 2.5" value={newRate} onChange={(e) => setNewRate(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-base px-3 py-2 text-xs text-arca-text-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-arca-text-dim font-semibold">Pago mínimo</label>
                <input type="number" placeholder="COP" value={newMin} onChange={(e) => setNewMin(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-base px-3 py-2 text-xs text-arca-text-primary focus:outline-none" />
              </div>
            </div>
            <button type="button" onClick={addDebt}
              className="w-full rounded-2xl bg-arca-accent px-4 py-2.5 text-xs font-bold text-[#15110c] hover:bg-arca-accent-hover">
              Agregar al Plan
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
