'use client';

import React, { useState } from 'react';
import { Car, Calendar, ShieldCheck, Wrench, FileText, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { haptics } from '@/src/lib/haptics';

export function VehiclePlannerTab() {
  const [vehicleName, setVehicleName] = useState('Mi Carro');
  const [vehicleType, setVehicleType] = useState<'car' | 'motorcycle'>('car');
  const [soatMonth, setSoatMonth] = useState('Mayo');
  const [tecnoMonth, setTecnoMonth] = useState('Junio');
  const [taxMonth, setTaxMonth] = useState('Julio');
  const [scheduled, setScheduled] = useState(false);

  const isCar = vehicleType === 'car';
  const soatCost = isCar ? 650000 : 550000;
  const tecnoCost = isCar ? 320000 : 210000;
  const taxCost = isCar ? 850000 : 220000;

  const totalAnnualCost = soatCost + tecnoCost + taxCost;
  const monthlyProvision = Math.round(totalAnnualCost / 12);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  const handleSchedule = () => {
    haptics.medium();
    setScheduled(true);
    setTimeout(() => setScheduled(false), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Vehicle Form Controls */}
      <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-arca-border">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Car size={20} />
          </span>
          <div>
            <h3 className="text-base font-black text-arca-text-primary">Gestor Vehicular & SOAT</h3>
            <p className="text-xs text-arca-text-dim">Programa vencimientos e impuestos sin sorpresas de caja</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-arca-text-dim">Vehículo</label>
            <input
              type="text"
              value={vehicleName}
              onChange={(e) => setVehicleName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-surface-2 p-3 text-xs font-bold text-arca-text-primary focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-arca-text-dim">Tipo</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as 'car' | 'motorcycle')}
              className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-surface-2 p-3 text-xs font-bold text-arca-text-primary focus:border-amber-500 focus:outline-none"
            >
              <option value="car">🚗 Carro</option>
              <option value="motorcycle">🏍️ Moto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Monthly Provision Banner */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-arca-surface-1 to-arca-surface-2 p-5 shadow-xl text-center space-y-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
          Cuota de Previsión Mensual Sugerida
        </span>
        <p className="text-3xl font-black text-amber-300">{formatMoney(monthlyProvision)}/mes</p>
        <p className="text-xs text-arca-text-secondary">
          Cubre tu total anual de {formatMoney(totalAnnualCost)} sin afectar tu liquidez diaria
        </p>
      </div>

      {/* Obligations List */}
      <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-5 shadow-xl space-y-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-arca-text-dim">
          Gastos Anuales de {vehicleName}
        </p>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between rounded-2xl bg-arca-surface-2 p-3.5 border border-arca-border">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={18} className="text-amber-400" />
              <div>
                <p className="font-bold text-arca-text-primary">SOAT Obligatorio</p>
                <p className="text-[10px] text-arca-text-dim">Vence en: {soatMonth}</p>
              </div>
            </div>
            <span className="font-mono font-bold text-amber-300">{formatMoney(soatCost)}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-arca-surface-2 p-3.5 border border-arca-border">
            <div className="flex items-center gap-2.5">
              <Wrench size={18} className="text-amber-400" />
              <div>
                <p className="font-bold text-arca-text-primary">Revisión Tecnomecánica</p>
                <p className="text-[10px] text-arca-text-dim">Vence en: {tecnoMonth}</p>
              </div>
            </div>
            <span className="font-mono font-bold text-amber-300">{formatMoney(tecnoCost)}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-arca-surface-2 p-3.5 border border-arca-border">
            <div className="flex items-center gap-2.5">
              <FileText size={18} className="text-amber-400" />
              <div>
                <p className="font-bold text-arca-text-primary">Impuesto Vehicular</p>
                <p className="text-[10px] text-arca-text-dim">Vence en: {taxMonth}</p>
              </div>
            </div>
            <span className="font-mono font-bold text-amber-300">{formatMoney(taxCost)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSchedule}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 text-black font-extrabold text-xs active:scale-95 transition-all shadow-lg shadow-amber-500/20"
        >
          {scheduled ? (
            <>
              <Check size={16} />
              <span>¡Gastos Vehiculares Programados en Arca!</span>
            </>
          ) : (
            <>
              <Calendar size={16} />
              <span>Programar Gastos como Obligaciones Futuras</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
