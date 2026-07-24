'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronRight, X, ChevronLeft } from 'lucide-react';
import { haptics } from '@/src/lib/haptics';
import { ESCUELA_MODULES, type EscuelaModule, type Story } from './content';

const COLOR_MAP: Record<string, { card: string; badge: string; progress: string; takeaway: string }> = {
  violet: {
    card: 'border-violet-500/30 bg-violet-500/5',
    badge: 'bg-violet-500/15 text-violet-400',
    progress: 'bg-violet-400',
    takeaway: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  },
  blue: {
    card: 'border-blue-500/30 bg-blue-500/5',
    badge: 'bg-blue-500/15 text-blue-400',
    progress: 'bg-blue-400',
    takeaway: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  },
  amber: {
    card: 'border-amber-500/30 bg-amber-500/5',
    badge: 'bg-amber-500/15 text-amber-400',
    progress: 'bg-amber-400',
    takeaway: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  },
  emerald: {
    card: 'border-emerald-500/30 bg-emerald-500/5',
    badge: 'bg-emerald-500/15 text-emerald-400',
    progress: 'bg-emerald-400',
    takeaway: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  },
};

// ─── STORY READER ────────────────────────────────────────────────────────────
function StoryReader({
  module: mod,
  initialIndex,
  onClose,
}: {
  module: EscuelaModule;
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const story: Story = mod.stories[idx];
  const colors = COLOR_MAP[mod.color];
  const isFirst = idx === 0;
  const isLast = idx === mod.stories.length - 1;

  const goNext = () => {
    if (!isLast) { haptics.light(); setIdx(idx + 1); }
    else { haptics.medium(); onClose(); }
  };
  const goPrev = () => { if (!isFirst) { haptics.light(); setIdx(idx - 1); } };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="fixed inset-0 z-50 flex flex-col bg-arca-base"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-arca-border bg-arca-surface-1 text-arca-text-secondary"
        >
          <X size={18} />
        </button>
        <div className="flex flex-1 gap-1">
          {mod.stories.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= idx ? colors.progress : 'bg-arca-surface-2'
              }`}
            />
          ))}
        </div>
        <span className={`rounded-xl px-2 py-0.5 text-[10px] font-bold ${colors.badge}`}>
          {idx + 1}/{mod.stories.length}
        </span>
      </div>

      {/* Story content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={story.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.22 }}
          className="flex flex-1 flex-col overflow-y-auto px-5 pb-4"
        >
          {/* Module label */}
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-arca-text-dim">
            {mod.emoji} {mod.title}
          </p>

          {/* Story icon + title */}
          <div className="mt-4 flex items-start gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-3xl ${colors.card}`}>
              {story.icon}
            </div>
            <h2 className="text-xl font-black leading-tight text-arca-text-primary">{story.title}</h2>
          </div>

          {/* Paragraphs */}
          <div className="mt-5 space-y-4">
            {story.paragraphs.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-arca-text-secondary">
                {p}
              </p>
            ))}
          </div>

          {/* Key takeaway */}
          <div className={`mt-6 rounded-2xl border p-4 ${colors.takeaway}`}>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest opacity-70">💡 Para recordar</p>
            <p className="text-sm font-bold leading-snug">{story.keyTakeaway}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 px-5 py-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={isFirst}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-arca-border bg-arca-surface-1 text-arca-text-secondary disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={goNext}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl font-black text-sm ${
            isLast
              ? 'bg-arca-accent text-[#15110c]'
              : 'bg-arca-surface-2 text-arca-text-primary'
          }`}
        >
          {isLast ? '¡Listo! Completé el módulo' : 'Siguiente →'}
        </button>
      </div>
    </motion.div>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function EscuelaScreen({ onBack }: { onBack: () => void }) {
  const [activeModule, setActiveModule] = useState<EscuelaModule | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);

  const openStory = (mod: EscuelaModule, idx = 0) => {
    haptics.medium();
    setActiveModule(mod);
    setStoryIndex(idx);
  };

  return (
    <>
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
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">
              Educación Financiera
            </p>
            <h2 className="text-xl font-black text-arca-text-primary">Escuela Nova</h2>
          </div>
          <div className="w-10" />
        </div>

        {/* Intro */}
        <p className="text-center text-xs leading-relaxed text-arca-text-dim">
          Lecciones cortas para tomar mejores decisiones financieras.{'\n'}Aprende a tu ritmo, un tema a la vez.
        </p>

        {/* Module cards */}
        <div className="space-y-3">
          {ESCUELA_MODULES.map((mod) => {
            const colors = COLOR_MAP[mod.color];
            return (
              <div
                key={mod.id}
                className={`rounded-3xl border p-4 ${colors.card}`}
              >
                {/* Module header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl ${colors.card}`}>
                    {mod.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-arca-text-primary">{mod.title}</h3>
                    <p className="text-[11px] text-arca-text-dim">{mod.description}</p>
                  </div>
                  <span className={`rounded-xl px-2.5 py-1 text-[10px] font-bold ${colors.badge}`}>
                    {mod.stories.length} lecciones
                  </span>
                </div>

                {/* Story list */}
                <div className="space-y-1.5">
                  {mod.stories.map((story, i) => (
                    <button
                      key={story.id}
                      type="button"
                      onClick={() => openStory(mod, i)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-arca-base/60 px-3 py-2.5 text-left transition-all hover:bg-arca-base"
                    >
                      <span className="text-lg">{story.icon}</span>
                      <span className="flex-1 text-xs font-semibold text-arca-text-primary">{story.title}</span>
                      <ChevronRight size={14} className="shrink-0 text-arca-text-dim" />
                    </button>
                  ))}
                </div>

                {/* Open all button */}
                <button
                  type="button"
                  onClick={() => openStory(mod, 0)}
                  className={`mt-3 w-full rounded-2xl py-2.5 text-xs font-black ${colors.badge}`}
                >
                  Leer módulo completo →
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Story Reader Overlay */}
      <AnimatePresence>
        {activeModule && (
          <StoryReader
            module={activeModule}
            initialIndex={storyIndex}
            onClose={() => setActiveModule(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
