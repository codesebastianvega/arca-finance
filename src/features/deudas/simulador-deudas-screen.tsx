'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Flame,
  Snowflake,
  TrendingDown,
  Sparkles,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { haptics } from '@/src/lib/haptics';

interface DeudaItem {
  id: string;
  name: string;
  balance: number;
  interestRate: number; // Tasa mensual o anual %
  minimumPayment: number;
}

export default function SimuladorDeudasScreen({ onBack }: { onBack: () => void }) {
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball');
  const [extraPayment, setExtraPayment] = useState<number>(200000);

  const [deudas, setDeudas] = useState<DeudaItem[]>([
    { id: '1', name: 'Tarjeta Crédito Banco X', balance: 1500000, interestRate: 2.5, minimumPayment: 80000 },
    { id: '2', name: 'Préstamo Libre Inversión', balance: 4500000, interestRate: 1.8, minimumPayment: 150000 },
    { id: '3', name: 'Crédito Falabella', balance: 600000, interestRate: 2.8, minimumPayment: 50000 },
  ]);

  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newMin, setNewMin] = useState('');

  const addDeuda = () => {
    if (!newName.trim() || !newBalance) return;
    haptics.light();
    setDeudas((prev) => [
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
  };

  const removeDeuda = (id: string) => {
    haptics.light();
    setDeudas((prev) => prev.filter((d) => d.id !== id));
  };

  // Order deudas according to active strategy
  const sortedDeudas = [...deudas].sort((a, b) => {
    if (strategy === 'snowball') {
      return a.balance - b.balance; // Bola de Nieve: Menor saldo primero
    } else {
      return b.interestRate - a.interestRate; // Avalancha: Mayor tasa de interés primero
    }
  });

  const totalBalance = deudas.reduce((acc, d) => acc + d.balance, 0);
  const totalMinPayment = deudas.reduce((acc, d) => acc + d.minimumPayment, 0);

  // Quick estimation of months to payoff
  const totalMonthlyCommitment = totalMinPayment + extraPayment;
  const estimatedMonths = totalMonthlyCommitment > 0 ? Math.ceil(totalBalance / totalMonthlyCommitment) : 0;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-arca-border bg-arca-surface-1 text-arca-text-secondary hover:text-arca-text-primary"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Simulador de Libertad Financiera</p>
          <h2 className="text-xl font-black text-arca-text-primary">Estrategia de Deudas</h2>
        </div>
        <div className="w-10" />
      </div>

      {/* Summary Card */}
      <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-5 space-y-4">
        <div className="flex items-baseline justify-between border-b border-arca-border pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase text-arca-text-dim">Deuda Total a Liberar</p>
            <p className="text-2xl font-black text-amber-400">${totalBalance.toLocaleString('es-CO')} COP</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-arca-text-dim">Tiempo Est. Libertad</p>
            <p className="text-lg font-black text-emerald-400">~{estimatedMonths} meses</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-arca-text-dim uppercase tracking-wider">
            Abono Extra Mensual Disponibles (Acelerador)
          </label>
          <input
            type="number"
            value={extraPayment}
            onChange={(e) => setExtraPayment(Number(e.target.value) || 0)}
            placeholder="COP"
            className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-base px-4 py-2.5 text-base font-bold text-arca-text-primary focus:border-arca-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Strategy Toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            setStrategy('snowball');
          }}
          className={`flex flex-col items-center gap-2 rounded-3xl border p-4 text-center transition-all ${
            strategy === 'snowball'
              ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 font-bold shadow-lg'
              : 'border-arca-border bg-arca-surface-1 text-arca-text-dim hover:text-arca-text-primary'
          }`}
        >
          <Snowflake size={24} />
          <div>
            <p className="text-xs font-black">Bola de Nieve ⛄</p>
            <p className="text-[10px] text-arca-text-dim">Pagas el menor saldo primero (Mayor motivación mental)</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.medium();
            setStrategy('avalanche');
          }}
          className={`flex flex-col items-center gap-2 rounded-3xl border p-4 text-center transition-all ${
            strategy === 'avalanche'
              ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold shadow-lg'
              : 'border-arca-border bg-arca-surface-1 text-arca-text-dim hover:text-arca-text-primary'
          }`}
        >
          <Flame size={24} />
          <div>
            <p className="text-xs font-black">Avalancha 🔥</p>
            <p className="text-[10px] text-arca-text-dim">Pagas la mayor tasa de interés primero (Máximo ahorro $)</p>
          </div>
        </button>
      </div>

      {/* Order Priority List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-arca-text-dim">
          Orden de Prioridad de Pago ({strategy === 'snowball' ? 'Menor Saldo Primero' : 'Mayor Interés Primero'})
        </h3>

        <div className="space-y-2">
          {sortedDeudas.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                idx === 0
                  ? 'border-emerald-500/50 bg-emerald-500/10 shadow-md'
                  : 'border-arca-border bg-arca-surface-1'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl font-black text-xs ${
                    idx === 0 ? 'bg-emerald-500 text-black' : 'bg-arca-surface-2 text-arca-accent'
                  }`}
                >
                  #{idx + 1}
                </span>
                <div>
                  <p className="text-xs font-bold text-arca-text-primary">{item.name}</p>
                  <p className="text-[10px] text-arca-text-dim">
                    Interés: {item.interestRate}% mens. | Mínimo: ${item.minimumPayment.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-black text-arca-text-primary">
                    ${item.balance.toLocaleString('es-CO')}
                  </p>
                  {idx === 0 && (
                    <span className="inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                      🎯 Atacar Primero
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeDeuda(item.id)}
                  className="text-arca-text-dim hover:text-red-400 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add New Debt Form */}
      <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-4 space-y-3">
        <h4 className="text-xs font-bold text-arca-text-primary flex items-center gap-1.5">
          <Plus size={16} className="text-arca-accent" /> Agregar Nueva Deuda o Tarjeta al Simulador
        </h4>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Nombre de la deuda / tarjeta"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-2xl border border-arca-border bg-arca-base px-3 py-2 text-xs text-arca-text-primary focus:outline-none"
          />
          <input
            type="number"
            placeholder="Saldo Pendiente (COP)"
            value={newBalance}
            onChange={(e) => setNewBalance(e.target.value)}
            className="rounded-2xl border border-arca-border bg-arca-base px-3 py-2 text-xs text-arca-text-primary focus:outline-none"
          />
          <input
            type="number"
            placeholder="Tasa Interés Mensual % (ej: 2.5)"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            className="rounded-2xl border border-arca-border bg-arca-base px-3 py-2 text-xs text-arca-text-primary focus:outline-none"
          />
          <input
            type="number"
            placeholder="Pago Mínimo Mensual (COP)"
            value={newMin}
            onChange={(e) => setNewMin(e.target.value)}
            className="rounded-2xl border border-arca-border bg-arca-base px-3 py-2 text-xs text-arca-text-primary focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={addDeuda}
          className="w-full rounded-2xl bg-arca-accent px-4 py-2.5 text-xs font-bold text-[#15110c] hover:bg-arca-accent-hover transition-all"
        >
          Agregar al Plan de Liberación
        </button>
      </div>
    </div>
  );
}
