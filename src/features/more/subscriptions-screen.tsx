"use client";

import React, { useState } from 'react';
import { ChevronLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { Screen } from '@/src/types';
import { SubscriptionsViewModel } from '@/src/lib/subscriptions-data';
import { cancelIncomeTemplate, cancelExpenseTemplate } from '@/app/actions';
import { haptics } from '@/src/lib/haptics';
import { useRouter } from 'next/navigation';

export default function SubscriptionsScreen({ 
  data, 
  onBack 
}: { 
  data: SubscriptionsViewModel; 
  onBack: () => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'incomes' | 'expenses'>('incomes');

  const handleCancelTemplate = async (templateId: string, kind: 'income' | 'expense') => {
    if (!confirm("¿Seguro que quieres finalizar este contrato/suscripción? Se cancelarán todas las proyecciones futuras.")) return;
    
    haptics.success();
    try {
      if (kind === 'income') {
        await cancelIncomeTemplate(templateId);
      } else {
        await cancelExpenseTemplate(templateId);
      }
      router.refresh();
    } catch (e) {
      console.error("Error al cancelar contrato:", e);
      alert("Hubo un error al cancelar. Intenta de nuevo.");
    }
  };

  const currentList = activeTab === 'incomes' ? data.incomes : data.expenses;

  return (
    <div className="flex flex-col gap-6 font-sans w-full pb-32">
      {/* Header */}
      <header className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => {
            haptics.light();
            onBack();
          }}
          className="w-10 h-10 rounded-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border flex items-center justify-center hover:bg-arca-border transition-colors"
        >
          <ChevronLeft size={20} className="text-arca-text-secondary light:text-arca-light-text-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-arca-text-primary light:text-arca-light-text-primary">
            Suscripciones
          </h1>
          <p className="text-[10px] font-bold text-arca-text-dim light:text-arca-light-text-secondary uppercase tracking-[0.2em]">
            Contratos y Recurrencias
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex p-1 bg-arca-surface-2 light:bg-arca-light-surface-2 rounded-xl">
        <button
          onClick={() => setActiveTab('incomes')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'incomes' 
              ? 'bg-arca-base text-arca-accent shadow-sm' 
              : 'text-arca-text-secondary hover:text-white'
          }`}
        >
          Contratos (Ingresos)
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'expenses' 
              ? 'bg-arca-base text-arca-alert shadow-sm' 
              : 'text-arca-text-secondary hover:text-white'
          }`}
        >
          Suscripciones (Gastos)
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {currentList.length === 0 ? (
          <div className="text-center py-12 px-4 text-arca-text-dim">
            <RefreshCw size={32} className="mx-auto mb-4 opacity-50" />
            <p>No tienes {activeTab === 'incomes' ? 'contratos' : 'suscripciones'} registrados aún.</p>
          </div>
        ) : (
          currentList.map(sub => (
            <div key={sub.id} className={`card-arca p-4 flex flex-col gap-3 ${sub.status === 'cancelled' ? 'opacity-50 grayscale' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">{sub.name}</h3>
                  <p className="text-xs text-arca-text-secondary mt-1">
                    Inicio: {sub.startDate} {sub.endDate ? `• Fin: ${sub.endDate}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-black ${activeTab === 'incomes' ? 'text-arca-positive' : 'text-arca-alert'}`}>
                    ${new Intl.NumberFormat("es-CO").format(sub.defaultAmount)}
                  </p>
                  <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-wider mt-1">
                    / Mes
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-2 pt-3 border-t border-arca-border/40">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${sub.status === 'active' ? 'bg-arca-positive' : 'bg-arca-text-dim'}`} />
                  <span className="text-xs font-bold text-arca-text-secondary uppercase">
                    {sub.status === 'active' ? 'Activo' : 'Cancelado'}
                  </span>
                </div>
                
                {sub.status === 'active' && (
                  <button 
                    onClick={() => handleCancelTemplate(sub.id, sub.kind)}
                    className="px-3 py-1.5 rounded-lg bg-arca-alert/10 hover:bg-arca-alert/20 border border-arca-alert/30 text-arca-alert text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <AlertTriangle size={12} />
                    Finalizar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
