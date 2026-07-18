'use client';

import { useId, useState } from 'react';
import { CircleHelp, X } from 'lucide-react';

export type CalculationHelperProps = {
  title: string;
  description: string;
  formula: string;
  includes: string[];
  excludes: string[];
};

export function CalculationHelper({ title, description, formula, includes, excludes }: CalculationHelperProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-arca-text-dim transition-colors hover:text-arca-accent">
        <CircleHelp size={13} /> ¿Cómo se calcula?
      </button>

      {open ? (
        <div className="fixed inset-0 z-[760] flex items-end justify-center">
          <button type="button" aria-label="Cerrar explicación" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative w-full max-w-lg rounded-t-[30px] border-t border-arca-border-strong bg-arca-base p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-arca-border" />
            <header className="flex items-start justify-between gap-4">
              <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-accent">Entiende esta cifra</p><h2 id={titleId} className="mt-1 text-xl font-black text-arca-text-primary">{title}</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-arca-border bg-arca-surface-1 text-arca-text-secondary"><X size={18} /></button>
            </header>

            <p className="mt-4 text-xs leading-5 text-arca-text-secondary">{description}</p>
            <div className="mt-4 rounded-2xl border border-arca-accent/20 bg-arca-accent/[0.06] p-4"><p className="text-[8px] font-black uppercase tracking-wider text-arca-accent">Fórmula</p><p className="mt-2 text-sm font-black leading-5 text-arca-text-primary">{formula}</p></div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <HelperList title="Incluye" items={includes} tone="positive" />
              <HelperList title="No incluye" items={excludes} tone="neutral" />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function HelperList({ title, items, tone }: { title: string; items: string[]; tone: 'positive' | 'neutral' }) {
  return <div className="rounded-2xl border border-arca-border bg-arca-surface-1 p-3"><p className={`text-[8px] font-black uppercase tracking-wider ${tone === 'positive' ? 'text-arca-positive' : 'text-arca-text-dim'}`}>{title}</p><ul className="mt-2 space-y-2">{items.map((item) => <li key={item} className="text-[10px] leading-4 text-arca-text-secondary">• {item}</li>)}</ul></div>;
}
