'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Users,
  Calendar,
  DollarSign,
  Sparkles,
  Dice5,
  Check,
  Phone,
  UserCheck,
  Pin,
  PinOff,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { toast } from '@/src/components/toast-provider';
import { haptics } from '@/src/lib/haptics';
import { createSavingsChain, type CreateChainInput } from '../actions';
import type { ChainFrequency } from '../types';

interface MemberInput {
  turnNumber: number;
  memberName: string;
  phone: string;
  isCurrentUser: boolean;
  isPinned?: boolean;
}

export function CreateChainWizard({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [contributionAmount, setContributionAmount] = useState('100000');
  const [totalCount, setTotalCount] = useState(6);
  const [frequency, setFrequency] = useState<ChainFrequency>('biweekly_15d');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [userTurnNumber, setUserTurnNumber] = useState(1);
  const [members, setMembers] = useState<MemberInput[]>([]);

  // Initialize members list when moving to Step 4 or changing totalCount
  const initializeMembers = (count: number) => {
    const list: MemberInput[] = [];
    for (let i = 1; i <= count; i++) {
      const existing = members[i - 1];
      list.push({
        turnNumber: i,
        memberName: existing?.memberName || (i === userTurnNumber ? 'Tú (Usuario Arca)' : `Participante #${i}`),
        phone: existing?.phone || '',
        isCurrentUser: i === userTurnNumber,
        isPinned: existing?.isPinned || false,
      });
    }
    setMembers(list);
  };

  const handleNextStep = () => {
    haptics.light();
    if (step === 1 && !name.trim()) return;
    if (step === 3 && (members.length === 0 || members.length !== totalCount)) {
      initializeMembers(totalCount);
    }
    setStep((prev) => Math.min(5, prev + 1) as any);
  };

  const handlePrevStep = () => {
    haptics.light();
    setStep((prev) => Math.max(1, prev - 1) as any);
  };

  // Smart Shuffle: Keeps pinned members in place, shuffles only unpinned members!
  const shuffleTurns = () => {
    haptics.medium();
    const pinnedTurns = new Set(members.filter((m) => m.isPinned).map((m) => m.turnNumber));
    const allSlots = Array.from({ length: members.length }, (_, i) => i + 1);
    const availableSlots = allSlots.filter((slot) => !pinnedTurns.has(slot));

    const unpinnedMembers = members.filter((m) => !m.isPinned);
    const shuffledMembers = [...unpinnedMembers].sort(() => Math.random() - 0.5);

    let unpinnedIdx = 0;
    const nextMembers = members.map((m) => {
      if (m.isPinned) return m;
      const assignedSlot = availableSlots[unpinnedIdx];
      unpinnedIdx++;
      return { ...m, turnNumber: assignedSlot };
    });

    nextMembers.sort((a, b) => a.turnNumber - b.turnNumber);
    setMembers(nextMembers);

    const currentUserSlot = nextMembers.find((m) => m.isCurrentUser)?.turnNumber || 1;
    setUserTurnNumber(currentUserSlot);
    toast.success('🎲 Sorteo completado (se mantuvieron los turnos fijados 📌)');
  };

  const moveMember = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= members.length) return;
    haptics.light();

    const next = [...members];
    const tempTurn = next[index].turnNumber;
    next[index].turnNumber = next[targetIndex].turnNumber;
    next[targetIndex].turnNumber = tempTurn;

    next.sort((a, b) => a.turnNumber - b.turnNumber);
    setMembers(next);
  };

  const togglePin = (index: number) => {
    haptics.light();
    setMembers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isPinned: !next[index].isPinned };
      return next;
    });
  };

  const updateMember = (index: number, field: keyof MemberInput, val: any) => {
    setMembers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      if (field === 'isCurrentUser' && val === true) {
        next.forEach((m, i) => {
          if (i !== index) m.isCurrentUser = false;
        });
        setUserTurnNumber(next[index].turnNumber);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    haptics.success();

    try {
      const payload: CreateChainInput = {
        name: name.trim(),
        contributionAmount: Number(contributionAmount) || 0,
        frequency,
        startDate,
        userTurnNumber,
        members: members.map((m) => ({
          turnNumber: m.turnNumber,
          memberName: m.memberName.trim() || `Turno #${m.turnNumber}`,
          phone: m.phone.trim() || undefined,
          isCurrentUser: m.isCurrentUser,
        })),
      };

      await createSavingsChain(payload);
      toast.success('🎉 ¡Cadena de ahorro creada exitosamente!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Error al crear cadena', err.message || 'Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalPot = (Number(contributionAmount) || 0) * totalCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg rounded-3xl border border-arca-border bg-arca-surface-1 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Progress Bar */}
        <div className="w-full bg-arca-surface-2 h-1.5 overflow-hidden">
          <div
            className="h-full bg-arca-accent transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Header Controls */}
        <div className="flex items-center justify-between p-4 border-b border-arca-border">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-arca-accent">
            Paso {step} de 5
          </span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-arca-surface-2 text-arca-text-secondary hover:text-arca-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-arca-accent/10 text-arca-accent">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-xl font-black text-arca-text-primary">
                  ¿Cómo se llamará esta Cadena o Natillera?
                </h3>
                <p className="text-xs text-arca-text-dim">
                  Ej: Cadena de la Oficina, Natillera Familiar Diciembre, Grupo Amigos.
                </p>
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Escribe el nombre de la cadena..."
                  className="w-full rounded-2xl border border-arca-border bg-arca-base px-4 py-3 text-base text-arca-text-primary focus:border-arca-accent focus:outline-none"
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-arca-positive/10 text-arca-positive">
                  <DollarSign size={24} />
                </div>
                <h3 className="text-xl font-black text-arca-text-primary">
                  Monto de la cuota y participantes
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-arca-text-dim uppercase tracking-wider">
                      Cuota periódica por participante
                    </label>
                    <input
                      type="number"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      placeholder="Monto en COP"
                      className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-base px-4 py-3 text-lg font-bold text-arca-text-primary focus:border-arca-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-arca-text-dim uppercase tracking-wider">
                      Número de participantes (Personalizable)
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={totalCount}
                        onChange={(e) => {
                          const val = Math.max(2, Math.min(100, Number(e.target.value) || 2));
                          setTotalCount(val);
                        }}
                        className="w-24 rounded-2xl border border-arca-accent/50 bg-arca-base px-3 py-2.5 text-center text-lg font-black text-arca-accent focus:border-arca-accent focus:outline-none"
                      />
                      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {[4, 6, 10, 12, 15, 20].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setTotalCount(num)}
                            className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                              totalCount === num
                                ? 'border-arca-accent bg-arca-accent/15 text-arca-accent'
                                : 'border-arca-border bg-arca-base text-arca-text-secondary'
                            }`}
                          >
                            {num} p.
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-arca-accent/30 bg-arca-accent/5 p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-arca-accent">
                      Bolsa Acumulada Total por Ronda ({totalCount} personas)
                    </p>
                    <p className="text-2xl font-black text-arca-text-primary mt-1">
                      ${totalPot.toLocaleString('es-CO')} COP
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                  <Calendar size={24} />
                </div>
                <h3 className="text-xl font-black text-arca-text-primary">
                  Periodicidad y Fecha de Inicio
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-arca-text-dim uppercase tracking-wider">
                      ¿Cada cuánto se recolecta la cuota?
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[
                        { id: 'daily', label: 'Diaria (cada día)' },
                        { id: 'weekly_8d', label: 'Semanal (cada 8 días)' },
                        { id: 'biweekly_15d', label: 'Quincenal (cada 15 días)' },
                        { id: 'monthly', label: 'Mensual' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFrequency(item.id as ChainFrequency)}
                          className={`rounded-2xl border p-3 text-left transition-all ${
                            frequency === item.id
                              ? 'border-arca-accent bg-arca-accent/15 text-arca-accent font-bold'
                              : 'border-arca-border bg-arca-base text-arca-text-secondary'
                          }`}
                        >
                          <p className="text-xs">{item.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-arca-text-dim uppercase tracking-wider">
                      Fecha de Inicio de la Primera Ronda
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-arca-border bg-arca-base px-4 py-3 text-sm font-semibold text-arca-text-primary focus:border-arca-accent focus:outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-arca-text-primary">
                      Lista de Integrantes ({members.length})
                    </h3>
                    <p className="text-xs text-arca-text-dim">
                      Ingresa el nombre y WhatsApp de cada participante.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {members.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 rounded-2xl border border-arca-border bg-arca-base p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-arca-accent/20 text-[10px] font-black text-arca-accent">
                          #{m.turnNumber}
                        </span>
                        <input
                          type="text"
                          value={m.memberName}
                          onChange={(e) => updateMember(idx, 'memberName', e.target.value)}
                          placeholder="Nombre del participante"
                          className="flex-1 rounded-xl border border-arca-border bg-arca-surface-1 px-3 py-1.5 text-xs text-arca-text-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateMember(idx, 'isCurrentUser', true)}
                          className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all ${
                            m.isCurrentUser
                              ? 'bg-arca-accent text-[#15110c]'
                              : 'bg-arca-surface-2 text-arca-text-dim hover:text-arca-text-primary'
                          }`}
                        >
                          <UserCheck size={12} /> {m.isCurrentUser ? 'Soy Yo' : 'Es Yo'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-emerald-400 shrink-0" />
                        <input
                          type="text"
                          value={m.phone || ''}
                          onChange={(e) => updateMember(idx, 'phone', e.target.value)}
                          placeholder="Teléfono WhatsApp (ej: 3001234567)"
                          className="w-full rounded-xl border border-arca-border bg-arca-surface-1 px-3 py-1.5 text-xs text-arca-text-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-arca-text-primary">
                      Asignación y Sorteo de Turnos
                    </h3>
                    <p className="text-xs text-arca-text-dim">
                      Fija turnos específicos (📌) o sortea el resto al azar (🎲).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={shuffleTurns}
                    className="flex items-center gap-1.5 rounded-2xl bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/25 transition-all shadow-sm"
                  >
                    <Dice5 size={16} />
                    Sorteo 🎲
                  </button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {members.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-2xl border p-3 text-xs transition-all ${
                        m.isCurrentUser
                          ? 'border-arca-accent bg-arca-accent/10 font-bold'
                          : m.isPinned
                          ? 'border-amber-500/40 bg-amber-500/5 font-semibold'
                          : 'border-arca-border bg-arca-base'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-arca-surface-2 font-black text-arca-accent shrink-0">
                          #{m.turnNumber}
                        </span>
                        <div className="truncate">
                          <p className="text-arca-text-primary truncate">{m.memberName}</p>
                          {m.phone && <p className="text-[10px] text-emerald-400">{m.phone}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Reorder Buttons */}
                        <div className="flex items-center gap-0.5 bg-arca-surface-2 rounded-xl p-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveMember(idx, 'up')}
                            className="p-1 text-arca-text-dim hover:text-arca-text-primary disabled:opacity-30"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === members.length - 1}
                            onClick={() => moveMember(idx, 'down')}
                            className="p-1 text-arca-text-dim hover:text-arca-text-primary disabled:opacity-30"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>

                        {/* Pin Toggle Button */}
                        <button
                          type="button"
                          onClick={() => togglePin(idx)}
                          className={`flex items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold transition-all ${
                            m.isPinned
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-arca-surface-2 text-arca-text-dim hover:text-arca-text-primary'
                          }`}
                        >
                          {m.isPinned ? <Pin size={13} /> : <PinOff size={13} />}
                          {m.isPinned ? 'Fijado' : 'Libre'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation Controls */}
        <div className="flex items-center justify-between p-4 border-t border-arca-border bg-arca-surface-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex items-center gap-1 rounded-2xl border border-arca-border px-4 py-2 text-xs font-bold text-arca-text-secondary hover:text-arca-text-primary"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              type="button"
              disabled={step === 1 && !name.trim()}
              onClick={handleNextStep}
              className="flex items-center gap-1 rounded-2xl bg-arca-accent px-5 py-2 text-xs font-bold text-[#15110c] hover:bg-arca-accent-hover disabled:opacity-50"
            >
              Siguiente <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 rounded-2xl bg-arca-accent px-6 py-2.5 text-xs font-black text-[#15110c] hover:bg-arca-accent-hover disabled:opacity-50 shadow-lg"
            >
              <Check size={16} /> {isSubmitting ? 'Creando...' : 'Crear Cadena'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
