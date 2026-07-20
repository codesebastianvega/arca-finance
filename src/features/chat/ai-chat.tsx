'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, User, Bot, ArrowRight, Check } from 'lucide-react';
import { MessageResponse } from '@/src/components/ai-elements/message';
import {
  FinancialActionCard,
  isFinancialActionPart,
  type FinancialActionPart,
} from './financial-action-card';
import {
  DEFAULT_NOVA_PREFERENCES,
  NOVA_PREFERENCES_KEY,
  normalizeNovaPreferences,
} from '@/src/lib/nova-preferences';

const novaChatTransport = new DefaultChatTransport({
  api: '/api/chat',
  body: () => {
    try {
      const stored = window.localStorage.getItem(NOVA_PREFERENCES_KEY);
      return {
        novaPreferences: stored
          ? normalizeNovaPreferences(JSON.parse(stored))
          : DEFAULT_NOVA_PREFERENCES,
      };
    } catch {
      return { novaPreferences: DEFAULT_NOVA_PREFERENCES };
    }
  },
});

const PERSONAL_PLAN_FEATURES = [
  '150 consultas de Nova al mes',
  'Planeación y proyecciones',
  'Automatizaciones y recordatorios',
] as const;

export default function AiChat({
  isOpen,
  onClose,
  initialPrompt,
  onInitialPromptConsumed,
  currencyCode,
  monthlyLimit,
  initialUsed,
  onViewPlans,
  onViewChanges,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string | null;
  onInitialPromptConsumed?: () => void;
  currencyCode: string;
  monthlyLimit: number | null;
  initialUsed: number;
  onViewPlans?: () => void;
  onViewChanges?: () => void;
}) {
  const router = useRouter();
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [used, setUsed] = useState(initialUsed);
  const [quotaReached, setQuotaReached] = useState(
    monthlyLimit !== null && initialUsed >= monthlyLimit,
  );

  const remaining = monthlyLimit === null ? null : Math.max(0, monthlyLimit - used);
  const isFreeAllowance = monthlyLimit !== null && monthlyLimit <= 20;

  const { messages, sendMessage, status, addToolApprovalResponse } = useChat({
    transport: novaChatTransport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onError: (error) => {
      console.error('Chat error:', error);
      const isQuotaError = error.message.toLowerCase().includes('alcanzaste')
        || error.message.toLowerCase().includes('mensuales de nova');
      if (isQuotaError) {
        setQuotaReached(true);
        if (monthlyLimit !== null) setUsed(monthlyLimit);
        return;
      }
      setErrorToast("Nova no pudo responder ahora. Intenta de nuevo en un momento.");
      setTimeout(() => setErrorToast(null), 5000);
    }
  });
  const isLoading = status === 'submitted' || status === 'streaming';
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const refreshedToolCallsRef = useRef(new Set<string>());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    let shouldRefresh = false;

    for (const message of messages) {
      for (const part of message.parts) {
        if (
          isFinancialActionPart(part) &&
          part.state === 'output-available' &&
          part.toolCallId &&
          !refreshedToolCallsRef.current.has(part.toolCallId)
        ) {
          refreshedToolCallsRef.current.add(part.toolCallId);
          shouldRefresh = true;
        }
      }
    }

    if (shouldRefresh) router.refresh();
  }, [messages, router]);

  useEffect(() => {
    setUsed(initialUsed);
    setQuotaReached(monthlyLimit !== null && initialUsed >= monthlyLimit);
  }, [initialUsed, monthlyLimit]);

  useEffect(() => {
    const prompt = initialPrompt?.trim();
    if (!isOpen || !prompt || isLoading) return;

    onInitialPromptConsumed?.();
    if (remaining === 0) {
      setQuotaReached(true);
      return;
    }
    void sendMessage({ text: prompt });
    setUsed((current) => current + 1);
  }, [initialPrompt, isLoading, isOpen, onInitialPromptConsumed, remaining, sendMessage]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    if (remaining === 0) {
      setQuotaReached(true);
      return;
    }
    sendMessage({ text: inputValue });
    setUsed((current) => current + 1);
    setInputValue('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 h-[85vh] bg-arca-base/95 backdrop-blur-2xl rounded-t-[32px] z-50 flex flex-col shadow-[0_-18px_55px_rgba(0,0,0,0.65)] border-t border-arca-border-strong overflow-hidden text-arca-text-primary"
          >
            {/* Subtle Arca ambient light */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-arca-accent/[0.06] blur-[100px]" />
              <div className="absolute -bottom-36 -left-24 h-80 w-80 rounded-full bg-arca-positive/[0.035] blur-[120px]" />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between p-6 border-b border-arca-border bg-arca-surface-1/80">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-arca-accent/10 border border-arca-accent/25 flex items-center justify-center">
                  <Sparkles className="text-arca-accent" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-arca-text-primary tracking-wide">Nova</h3>
                  <p className="text-[10px] text-arca-text-dim font-bold uppercase tracking-[0.16em]">
                    {remaining === null ? 'Acceso completo' : `${remaining} de ${monthlyLimit} consultas disponibles`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar Nova"
                className="w-10 h-10 rounded-full bg-arca-surface-2 border border-arca-border flex items-center justify-center text-arca-text-secondary hover:text-arca-text-primary hover:border-arca-border-strong transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Toast */}
            <AnimatePresence>
              {errorToast && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-[100px] left-1/2 -translate-x-1/2 z-50 bg-red-500/90 backdrop-blur-sm text-white px-5 py-2.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-sm font-medium flex items-center space-x-2 text-center border border-red-500/20 max-w-[90%]"
                >
                  <span>{errorToast}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {quotaReached ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 flex items-end justify-center bg-black/70 p-4 pb-safe backdrop-blur-sm"
                >
                  <motion.section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="nova-quota-title"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 30, opacity: 0 }}
                    className="w-full max-w-md rounded-[28px] border border-arca-accent/35 bg-arca-surface-1 p-5 shadow-2xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-arca-accent/12 text-arca-accent"><Sparkles size={22} /></span>
                      <button type="button" onClick={() => setQuotaReached(false)} aria-label="Cerrar aviso" className="flex h-9 w-9 items-center justify-center rounded-full bg-arca-surface-2 text-arca-text-dim"><X size={17} /></button>
                    </div>
                    <p className="mt-5 text-[9px] font-black uppercase tracking-[0.18em] text-arca-accent">{isFreeAllowance ? 'Tus consultas gratuitas' : 'Uso mensual de Nova'}</p>
                    <h4 id="nova-quota-title" className="mt-2 text-2xl font-black leading-tight text-arca-text-primary">{isFreeAllowance ? `Nova te acompañó en tus primeras ${monthlyLimit ?? 20}` : 'Alcanzaste el límite de tu plan'}</h4>
                    <p className="mt-3 text-sm leading-6 text-arca-text-secondary">Tus consultas se renovarán el primer día del próximo mes. {isFreeAllowance ? 'Si quieres seguir ahora, Arca Personal amplía tu acceso.' : 'Puedes revisar los planes disponibles para ampliar tu acceso.'}</p>
                    <div className="mt-5 space-y-2 rounded-2xl bg-arca-surface-2 p-4">
                      {PERSONAL_PLAN_FEATURES.map((feature) => (
                        <p key={feature} className="flex items-center gap-2 text-xs font-semibold text-arca-text-secondary"><Check size={14} className="text-arca-success" />{feature}</p>
                      ))}
                    </div>
                    <button type="button" onClick={onViewPlans} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-black">{isFreeAllowance ? 'Conocer Arca Personal' : 'Revisar planes'} <ArrowRight size={17} /></button>
                    <button type="button" onClick={() => { setQuotaReached(false); onClose(); }} className="mt-2 h-11 w-full text-xs font-bold text-arca-text-dim">Seguir con Arca Gratis</button>
                  </motion.section>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Messages */}
            <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-70">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles size={48} className="text-arca-accent" />
                  </motion.div>
                  <p className="text-sm text-arca-text-secondary max-w-[250px] font-medium">
                    Escribe algo como: "¿Cuánto me sobra este mes?"
                  </p>
                </div>
              )}
              
              {messages.map((m) => {
                const hasVisiblePart = m.parts.some(
                  (part) =>
                    (part.type === 'text' && Boolean(part.text)) ||
                    isFinancialActionPart(part),
                );
                const showLoading = m.role === 'assistant' && !hasVisiblePart && isLoading;
                const isStreamingMessage =
                  m.role === 'assistant' &&
                  isLoading &&
                  m.id === messages.at(-1)?.id;

                // Tool-only messages remain in SDK state but should not leave
                // a completed empty bubble in the visible conversation.
                if (!hasVisiblePart && !showLoading) return null;

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end space-x-2 max-w-[92%] ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${m.role === 'user' ? 'bg-arca-surface-2 border-arca-border-strong' : 'bg-arca-accent/10 border-arca-accent/30'}`}>
                        {m.role === 'user' ? <User size={16} className="text-arca-text-secondary" /> : <Bot size={16} className="text-arca-accent" />}
                      </div>
                      <div className={`flex min-w-0 flex-col gap-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {m.parts.map((part, index) => {
                          if (part.type === 'text' && part.text) {
                            return (
                              <div
                                key={`${m.id}-text-${index}`}
                                className={`p-4 rounded-[20px] text-sm leading-relaxed border ${m.role === 'user' ? 'whitespace-pre-wrap bg-arca-surface-2 border-arca-border-strong text-arca-text-primary rounded-br-sm' : 'bg-arca-surface-1 border-arca-border text-arca-text-primary rounded-bl-sm shadow-[0_8px_24px_-18px_rgba(0,0,0,0.9)]'}`}
                              >
                                {m.role === 'assistant' ? (
                                  <MessageResponse
                                    className="nova-markdown"
                                    isAnimating={isStreamingMessage}
                                  >
                                    {part.text}
                                  </MessageResponse>
                                ) : (
                                  part.text
                                )}
                              </div>
                            );
                          }

                          if (isFinancialActionPart(part)) {
                            const actionPart = part as FinancialActionPart;
                            return (
                              <FinancialActionCard
                                currencyCode={currencyCode}
                                key={actionPart.toolCallId ?? `${m.id}-${part.type}-${index}`}
                                onApproval={(id, approved) => {
                                  void addToolApprovalResponse({ id, approved });
                                }}
                                onContinue={() => inputRef.current?.focus()}
                                onViewChanges={onViewChanges}
                                part={actionPart}
                              />
                            );
                          }

                          return null;
                        })}

                        {showLoading && (
                          <div className={`p-4 rounded-[20px] text-sm leading-relaxed border ${m.role === 'user' ? 'whitespace-pre-wrap bg-arca-surface-2 border-arca-border-strong text-arca-text-primary rounded-br-sm' : 'bg-arca-surface-1 border-arca-border text-arca-text-primary rounded-bl-sm shadow-[0_8px_24px_-18px_rgba(0,0,0,0.9)]'}`}>
                            <div className="flex space-x-1.5 items-center h-4 mt-1 mb-1 mx-1">
                              <motion.div className="w-1.5 h-1.5 bg-arca-accent rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                              <motion.div className="w-1.5 h-1.5 bg-arca-accent rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                              <motion.div className="w-1.5 h-1.5 bg-arca-accent rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="relative z-10 p-4 pb-safe bg-arca-surface-1/90 backdrop-blur-xl border-t border-arca-border">
              <form onSubmit={onSubmit} className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Pregúntale a Nova..."
                  className="w-full bg-arca-surface-2 border border-arca-border text-arca-text-primary placeholder:text-arca-text-dim rounded-full pl-6 pr-14 py-4 focus:outline-none focus:ring-1 focus:ring-arca-accent/50 focus:border-arca-accent/40 text-sm transition-all"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  aria-label="Enviar mensaje"
                  className="absolute right-2 w-10 h-10 rounded-full bg-arca-accent flex items-center justify-center text-[#15110c] hover:bg-arca-accent-hover disabled:opacity-30 transition-all disabled:shadow-none"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
