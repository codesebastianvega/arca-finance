'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Plus,
  Users,
  Calendar,
  DollarSign,
  MessageCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Sparkles,
  Share2,
  AlertTriangle,
  Gift,
} from 'lucide-react';
import { toast } from '@/src/components/toast-provider';
import { haptics } from '@/src/lib/haptics';
import {
  getSavingsChainsViewModel,
  toggleMemberPayoutStatus,
  deleteSavingsChain,
} from './actions';
import type { SavingsChain, SavingsChainMember, SavingsChainsViewModel } from './types';
import { CreateChainWizard } from './components/create-chain-wizard';
import { exportChainToCSV, printChainSummaryHTML } from '../reports/exporter';

export default function CadenasScreen({ onBack }: { onBack: () => void }) {
  const [viewModel, setViewModel] = useState<SavingsChainsViewModel | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadData = () => {
    getSavingsChainsViewModel()
      .then((vm) => {
        setViewModel(vm);
        if (!selectedChainId && vm.chains.length > 0) {
          setSelectedChainId(vm.chains[0].id);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeChain = viewModel?.chains.find((c) => c.id === selectedChainId) || viewModel?.chains[0];

  const handleTogglePayout = (memberId: string, currentStatus: 'pending' | 'paid') => {
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    haptics.medium();

    startTransition(() => {
      toggleMemberPayoutStatus(memberId, nextStatus)
        .then(() => {
          toast.success(nextStatus === 'paid' ? '🟢 Cobro de pozo registrado' : 'Cobro revertido');
          loadData();
        })
        .catch((err: Error) => toast.error('Error al actualizar', err.message));
    });
  };

  const handleDeleteChain = (chainId: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta cadena de ahorro?')) return;
    haptics.error();

    startTransition(() => {
      deleteSavingsChain(chainId)
        .then(() => {
          toast.success('Cadena eliminada');
          setSelectedChainId(null);
          loadData();
        })
        .catch((err: Error) => toast.error('Error al eliminar', err.message));
    });
  };

  // Helper for WhatsApp Links
  const openWhatsAppMessage = (
    member: SavingsChainMember,
    chain: SavingsChain,
    type: 'payout' | 'reminder' | 'overdue'
  ) => {
    if (!member.phone) {
      toast.error('Este integrante no tiene número de WhatsApp guardado.');
      return;
    }
    haptics.light();

    const cleanPhone = member.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    const amountStr = `$${chain.contributionAmount.toLocaleString('es-CO')}`;
    const potStr = `$${chain.totalPot.toLocaleString('es-CO')}`;

    let text = '';
    if (type === 'payout') {
      text = `¡Hola ${member.memberName}! 🎉 Te notifico que hoy es tu turno #${member.turnNumber} para recibir la bolsa acumulada de la cadena "${chain.name}" por ${potStr} COP. ¡Felicitaciones! 🥳`;
    } else if (type === 'reminder') {
      text = `Hola ${member.memberName}, 👋 te recuerdo amigablemente que hoy corresponde el pago de la cuota de la cadena "${chain.name}" por ${amountStr} COP. ¡Muchas gracias!`;
    } else {
      text = `Hola ${member.memberName}, ⚠️ recordatorio amigable: la cuota de la cadena "${chain.name}" por ${amountStr} COP registra pendiente. Quedamos atentos para mantener la ronda al día. ¡Gracias!`;
    }

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="relative space-y-6 overflow-hidden pb-12">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Volver"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-arca-surface-2 text-arca-text-dim transition-colors hover:text-arca-accent"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-arca-accent">
              Finanzas Colaborativas
            </p>
            <h2 className="text-xl font-black text-arca-text-primary">
              Cadenas de Ahorro y Natilleras
            </h2>
          </div>
        </div>

        <button
          onClick={() => setIsWizardOpen(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-arca-accent px-4 py-2 text-xs font-black text-[#15110c] hover:bg-arca-accent-hover transition-all shadow-lg"
        >
          <Plus size={16} /> Nueva Cadena
        </button>
      </header>

      {/* Summary Widgets */}
      {viewModel && viewModel.chains.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-arca-text-dim">
              Cadenas Activas
            </p>
            <p className="mt-1 text-xl font-black text-arca-text-primary">
              {viewModel.totalActiveChains}
            </p>
          </div>
          <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-arca-text-dim">
              Compromiso Estimado
            </p>
            <p className="mt-1 text-xl font-black text-arca-accent">
              ${viewModel.totalMonthlyCommitment.toLocaleString('es-CO')}
            </p>
          </div>
          {viewModel.nextUserPayout && (
            <div className="col-span-2 sm:col-span-1 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Próximo Cobro
              </p>
              <p className="mt-1 text-lg font-black text-emerald-300">
                ${viewModel.nextUserPayout.amount.toLocaleString('es-CO')}
              </p>
              <p className="text-[10px] text-emerald-400 font-medium truncate">
                en {viewModel.nextUserPayout.daysRemaining} días ({viewModel.nextUserPayout.chainName})
              </p>
            </div>
          )}
        </div>
      )}

      {/* Multicadena Selector Cards */}
      {viewModel && viewModel.chains.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-arca-text-dim">
            Tus Cadenas en Curso
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {viewModel.chains.map((chain) => {
              const isSelected = chain.id === activeChain?.id;
              return (
                <button
                  key={chain.id}
                  onClick={() => setSelectedChainId(chain.id)}
                  className={`flex shrink-0 min-w-[220px] flex-col justify-between rounded-3xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-arca-accent bg-arca-accent/15 shadow-xl'
                      : 'border-arca-border bg-arca-surface-1 hover:border-arca-border-strong'
                  }`}
                >
                  <div>
                    <span className="inline-block rounded-full bg-arca-accent/20 px-2 py-0.5 text-[9px] font-bold text-arca-accent">
                      {chain.members.length} Turnos
                    </span>
                    <h4 className="mt-2 text-sm font-bold text-arca-text-primary truncate">
                      {chain.name}
                    </h4>
                    <p className="mt-0.5 text-[11px] text-arca-text-dim font-semibold">
                      Pozo: ${chain.totalPot.toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-2 text-[10px] text-arca-text-dim">
                    <span>Tu turno: #{chain.userTurnNumber}</span>
                    <span>Ronda {chain.currentRoundNumber}/{chain.totalRounds}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Chain Details Matrix */}
      {activeChain ? (
        <section className="space-y-4 rounded-3xl border border-arca-border bg-arca-surface-1 p-5">
          <div className="flex items-center justify-between border-b border-arca-border pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-arca-accent">
                Detalle de Cadena
              </span>
              <h3 className="text-xl font-black text-arca-text-primary">{activeChain.name}</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => printChainSummaryHTML(activeChain)}
                className="flex items-center gap-1.5 rounded-2xl border border-arca-border bg-arca-base px-3 py-2 text-xs font-bold text-arca-text-secondary hover:text-arca-text-primary hover:border-arca-accent/40 transition-all"
                title="Imprimir / Exportar a PDF"
              >
                📄 PDF
              </button>
              <button
                type="button"
                onClick={() => exportChainToCSV(activeChain)}
                className="flex items-center gap-1.5 rounded-2xl border border-arca-border bg-arca-base px-3 py-2 text-xs font-bold text-arca-text-secondary hover:text-arca-text-primary hover:border-arca-accent/40 transition-all"
                title="Exportar a Excel / CSV"
              >
                📊 Excel
              </button>
              <button
                onClick={() => handleDeleteChain(activeChain.id)}
                className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                title="Eliminar cadena"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-arca-border bg-arca-base p-3">
              <p className="text-[9px] font-bold uppercase text-arca-text-dim">Cuota Individual</p>
              <p className="text-sm font-bold text-arca-text-primary mt-0.5">
                ${activeChain.contributionAmount.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="rounded-2xl border border-arca-border bg-arca-base p-3">
              <p className="text-[9px] font-bold uppercase text-arca-text-dim">Pozo por Ronda</p>
              <p className="text-sm font-bold text-arca-accent mt-0.5">
                ${activeChain.totalPot.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="rounded-2xl border border-arca-border bg-arca-base p-3">
              <p className="text-[9px] font-bold uppercase text-arca-text-dim">Tu Turno</p>
              <p className="text-sm font-bold text-arca-text-primary mt-0.5">
                Turno #{activeChain.userTurnNumber}
              </p>
            </div>
            <div className="rounded-2xl border border-arca-border bg-arca-base p-3">
              <p className="text-[9px] font-bold uppercase text-arca-text-dim">Tu Fecha de Cobro</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">
                {activeChain.userPayoutDate}
              </p>
            </div>
          </div>

          {/* Members & Turn Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-arca-text-primary">
                Matriz de Integrantes y Cobro de Bolsa
              </h4>
              <span className="text-[10px] text-arca-text-dim">
                {activeChain.members.filter((m) => m.payoutStatus === 'paid').length} / {activeChain.members.length} bolsas entregadas
              </span>
            </div>

            <div className="space-y-2">
              {activeChain.members.map((member) => {
                const isPaid = member.payoutStatus === 'paid';
                return (
                  <div
                    key={member.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border p-3 gap-3 transition-all ${
                      member.isCurrentUser
                        ? 'border-arca-accent/50 bg-arca-accent/10'
                        : isPaid
                        ? 'border-emerald-500/30 bg-emerald-500/5 opacity-80'
                        : 'border-arca-border bg-arca-base'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                          isPaid
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-arca-surface-2 text-arca-accent'
                        }`}
                      >
                        #{member.turnNumber}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-arca-text-primary">
                            {member.memberName}
                          </span>
                          {member.isCurrentUser && (
                            <span className="rounded-full bg-arca-accent/20 px-2 py-0.5 text-[9px] font-bold text-arca-accent">
                              Tú
                            </span>
                          )}
                        </div>
                        {member.phone && (
                          <p className="text-[10px] text-emerald-400 font-medium">
                            WhatsApp: {member.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions & Status */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 border-t border-black/10 pt-2 sm:border-t-0 sm:pt-0">
                      {/* WhatsApp Buttons */}
                      {member.phone && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Notificar Cobro de Bolsa"
                            onClick={() => openWhatsAppMessage(member, activeChain, 'payout')}
                            className="flex items-center gap-1 rounded-xl bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            <Gift size={12} /> Bolsa
                          </button>
                          <button
                            type="button"
                            title="Recordatorio de Cuota"
                            onClick={() => openWhatsAppMessage(member, activeChain, 'reminder')}
                            className="flex items-center gap-1 rounded-xl bg-arca-accent/10 px-2 py-1 text-[10px] font-bold text-arca-accent hover:bg-arca-accent/20 transition-colors"
                          >
                            <MessageCircle size={12} /> Cuota
                          </button>
                          <button
                            type="button"
                            title="Aviso de Atraso"
                            onClick={() => openWhatsAppMessage(member, activeChain, 'overdue')}
                            className="flex items-center gap-1 rounded-xl bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
                          >
                            <AlertTriangle size={12} /> Atraso
                          </button>
                        </div>
                      )}

                      {/* Toggle Payout Status Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePayout(member.id, member.payoutStatus)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                          isPaid
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-arca-surface-2 text-arca-text-secondary hover:text-arca-text-primary'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        {isPaid ? 'Bolsa Entregada' : 'Marcar Cobrado'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-arca-border p-12 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-arca-accent/10 text-arca-accent">
            <Users size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-arca-text-primary">
              No tienes cadenas de ahorro creadas
            </h3>
            <p className="mt-1 text-xs text-arca-text-dim max-w-sm">
              Crea tu primera cadena o natillera para administrar participantes, recaudo de cuotas y fechas de entrega de la bolsa.
            </p>
          </div>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-arca-accent px-5 py-2.5 text-xs font-black text-[#15110c] hover:bg-arca-accent-hover transition-all shadow-lg"
          >
            <Plus size={16} /> Crear mi Primera Cadena
          </button>
        </div>
      )}

      {/* Typeform Wizard Modal */}
      <CreateChainWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
