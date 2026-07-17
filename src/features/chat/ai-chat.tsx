'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, User, Bot, Loader2 } from 'lucide-react';

export default function AiChat({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const { messages, sendMessage, isLoading } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    onError: (error) => {
      console.error('Chat error:', error);
      setErrorToast("Los servidores de Google están ocupados, intenta de nuevo.");
      setTimeout(() => setErrorToast(null), 5000);
    }
  });
  const [inputValue, setInputValue] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ role: 'user', content: inputValue });
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
            className="fixed bottom-0 left-0 right-0 h-[85vh] bg-black/70 backdrop-blur-2xl rounded-t-[32px] z-50 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-emerald-500/20 overflow-hidden text-white"
          >
            {/* Animated Background Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                  rotate: [0, 90, 180, 270, 360],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-20%] left-[-20%] w-[40rem] h-[40rem] bg-purple-500/20 rounded-full blur-[120px]"
              />
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.2, 0.4, 0.2],
                  rotate: [360, 270, 180, 90, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 1 }}
                className="absolute bottom-[-20%] right-[-20%] w-[50rem] h-[50rem] bg-fuchsia-500/20 rounded-full blur-[150px]"
              />
              <motion.div
                animate={{
                  opacity: [0.1, 0.3, 0.1],
                  scale: [0.8, 1.1, 0.8],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[30%] left-[30%] w-64 h-64 bg-violet-600/20 rounded-full blur-[80px]"
              />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/10 bg-transparent">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500/30 to-fuchsia-500/20 border border-purple-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                  <Sparkles className="text-purple-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">Nova</h3>
                  <p className="text-xs text-purple-200/60 font-medium uppercase tracking-wider">Asistente Premium</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
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
                    <Sparkles size={48} className="text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                  </motion.div>
                  <p className="text-sm text-purple-100/70 max-w-[250px] font-medium">
                    Escribe algo como: "¿Cuánto me sobra este mes?"
                  </p>
                </div>
              )}
              
              {messages.map((m) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={m.id} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end space-x-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${m.role === 'user' ? 'bg-white/10 border-white/20 backdrop-blur-md' : 'bg-purple-500/20 border-purple-500/40 backdrop-blur-md shadow-[0_0_10px_rgba(168,85,247,0.2)]'}`}>
                      {m.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-purple-400" />}
                    </div>
                    <div className={`p-4 rounded-[20px] text-sm leading-relaxed backdrop-blur-md border ${m.role === 'user' ? 'bg-white/10 border-white/20 text-white rounded-br-sm shadow-lg' : 'bg-purple-950/40 border-purple-500/30 text-purple-50 rounded-bl-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)]'}`}>
                      {m.content}
                      {/* AI SDK v7 responses often use parts instead of content */}
                      {(m as any).parts?.map((part: any, index: number) => {
                        if (part.type === 'text') {
                          return <span key={index}>{part.text}</span>;
                        }
                        if (part.type === 'tool-invocation') {
                          return (
                            <div key={index} className="mt-3 pt-3 border-t border-purple-500/20 text-xs opacity-80 flex items-center text-purple-200">
                              <Loader2 size={12} className="mr-2 animate-spin text-purple-400" /> Consultando base de datos ({part.toolInvocation.toolName})...
                            </div>
                          );
                        }
                        return null;
                      })}
                      {m.toolInvocations && m.toolInvocations.map(tool => (
                        <div key={tool.toolCallId} className="mt-3 pt-3 border-t border-purple-500/20 text-xs opacity-80 flex items-center text-purple-200">
                          <Loader2 size={12} className="mr-2 animate-spin text-purple-400" /> Consultando datos...
                        </div>
                      ))}
                      
                      {/* Mostrar puntos de carga si el mensaje está vacío (cargando) */}
                      {m.role === 'assistant' && !m.content && (!(m as any).parts || (m as any).parts.length === 0) && (
                        <div className="flex space-x-1.5 items-center h-4 mt-1 mb-1 mx-1">
                          <motion.div className="w-1.5 h-1.5 bg-purple-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                          <motion.div className="w-1.5 h-1.5 bg-purple-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                          <motion.div className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="relative z-10 p-4 pb-safe bg-black/20 backdrop-blur-xl border-t border-white/10">
              <form onSubmit={onSubmit} className="relative flex items-center">
                <input
                  type="text"
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Pregúntale a Nova..."
                  className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/40 rounded-full pl-6 pr-14 py-4 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:bg-white/10 text-sm shadow-inner transition-all"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="absolute right-2 w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 flex items-center justify-center text-white hover:opacity-90 disabled:opacity-30 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:shadow-none"
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
