'use client';

import React, { useState } from 'react';
import { ArrowLeft, MessageSquareHeart, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { haptics } from '@/src/lib/haptics';
import { submitBetaFeedback } from '@/app/actions';

export default function FeedbackScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'bug' | 'idea' | 'pregunta' | 'amor'>('idea');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    haptics.medium();
    setStatus('loading');
    setErrorMessage(null);

    try {
      await submitBetaFeedback({ name, category, message });
      setStatus('success');
      haptics.success();
      setTimeout(() => onBack(), 2000);
    } catch (err) {
      setStatus('idle');
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo enviar el comentario');
    }
  };

  const categories = [
    { id: 'bug', icon: Bug, label: 'Bug/Error', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
    { id: 'idea', icon: Lightbulb, label: 'Sugerencia', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
    { id: 'pregunta', icon: HelpCircle, label: 'Pregunta', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
    { id: 'amor', icon: MessageSquareHeart, label: 'Me encanta', color: 'text-pink-400 bg-pink-400/10 border-pink-400/30' },
  ] as const;

  if (status === 'success') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-arca-accent/20 text-arca-accent">
          <MessageSquareHeart size={40} />
        </div>
        <h2 className="mb-2 text-2xl font-black text-arca-text-primary">¡Gracias!</h2>
        <p className="text-sm text-arca-text-secondary max-w-[250px]">
          Tus comentarios son muy valiosos para mejorar Arca.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-arca-border bg-arca-surface-1 text-arca-text-secondary hover:text-arca-text-primary"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">
            Beta Tester
          </p>
          <h2 className="text-xl font-black text-arca-text-primary">Enviar Feedback</h2>
        </div>
        <div className="w-10" />
      </div>

      <p className="text-center text-xs text-arca-text-dim px-4">
        ¿Encontraste un error? ¿Tienes una idea para mejorar Arca? ¡Cuéntanos!
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-arca-text-dim">
            ¿Qué tipo de comentario es?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  haptics.light();
                  setCategory(cat.id);
                }}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all ${
                  category === cat.id
                    ? cat.color
                    : 'border-arca-border bg-arca-surface-1 text-arca-text-secondary'
                }`}
              >
                <cat.icon size={20} />
                <span className="text-xs font-bold">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-arca-text-dim">
            Tu nombre (opcional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-arca-border bg-arca-surface-1 p-4 text-sm text-arca-text-primary placeholder-arca-text-dim outline-none focus:border-arca-accent"
            placeholder="¿Cómo te llamas?"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-arca-text-dim">
            Tu comentario
          </label>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="h-32 w-full resize-none rounded-2xl border border-arca-border bg-arca-surface-1 p-4 text-sm text-arca-text-primary placeholder-arca-text-dim outline-none focus:border-arca-accent"
            placeholder="Escribe tus sugerencias, dudas o errores que hayas encontrado..."
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || !message.trim()}
          className="mt-6 flex w-full items-center justify-center rounded-2xl bg-arca-accent py-4 text-sm font-black text-[#15110c] transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {status === 'loading' ? 'Enviando...' : 'Enviar comentario'}
        </button>
      </form>
    </div>
  );
}
