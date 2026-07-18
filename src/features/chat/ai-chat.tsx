'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, User, Bot } from 'lucide-react';
import { MessageResponse } from '@/src/components/ai-elements/message';
import {
  FinancialActionCard,
  isFinancialActionPart,
  type FinancialActionPart,
} from './financial-action-card';

export default function AiChat({
  isOpen,
  onClose,
  initialPrompt,
  onInitialPromptConsumed,
  currencyCode,
  onViewChanges,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string | null;
  onInitialPromptConsumed?: () => void;
  currencyCode: string;
  onViewChanges?: () => void;
}) {
  const router = useRouter();
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const { messages, sendMessage, status, addToolApprovalResponse } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onError: (error) => {
      console.error('Chat error:', error);
      setErrorToast("Los servidores de Google están ocupados, intenta de nuevo.");
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
    const prompt = initialPrompt?.trim();
    if (!isOpen || !prompt || isLoading) return;

    onInitialPromptConsumed?.();
    void sendMessage({ text: prompt });
  }, [initialPrompt, isLoading, isOpen, onInitialPromptConsumed, sendMessage]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue });
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
                  <p className="text-[10px] text-arca-text-dim font-bold uppercase tracking-[0.16em]">Agente financiera</p>
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
