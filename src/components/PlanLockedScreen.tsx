import { ArrowLeft, ArrowRight, Check, LockKeyhole, Sparkles } from 'lucide-react';
import type { RequiredPlan } from '@/src/lib/plan-entitlements';

const COPY = {
  personal_pro: {
    eyebrow: 'Función de Arca Personal',
    title: 'Lleva tus decisiones un paso más adelante',
    description: 'Desbloquea planeación, proyecciones, análisis, recurrencias y el acompañamiento de Nova.',
    features: ['Nova con 150 acciones al mes', 'Planeación y proyección', 'Análisis y recordatorios'],
    price: '$14.900 / mes',
  },
  business: {
    eyebrow: 'Función de Arca Negocios',
    title: 'Separa tus proyectos sin perder la visión completa',
    description: 'Gestiona unidades de negocio, contratos, facturas, cobros y métricas por proyecto.',
    features: ['Todo Arca Personal', 'Unidades y contratos', '500 acciones de Nova al mes'],
    price: '$39.900 / mes',
  },
} as const;

export default function PlanLockedScreen({ requiredPlan, onBack, onViewPlans }: { requiredPlan: RequiredPlan; onBack: () => void; onViewPlans: () => void }) {
  const copy = COPY[requiredPlan];
  return <div className="space-y-5"><button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-arca-surface-2 text-arca-text-dim" aria-label="Volver"><ArrowLeft size={19} /></button><section className="relative overflow-hidden rounded-[30px] border border-arca-accent/35 bg-arca-surface-1 p-6"><div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-arca-accent/10 blur-3xl" /><div className="relative"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-arca-accent/15 text-arca-accent"><LockKeyhole size={25} /></span><p className="mt-6 text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">{copy.eyebrow}</p><h1 className="mt-2 text-3xl font-black leading-[1.02] tracking-[-0.045em] text-arca-text-primary">{copy.title}</h1><p className="mt-4 text-sm leading-6 text-arca-text-secondary">{copy.description}</p><div className="mt-6 space-y-3">{copy.features.map((feature) => <p key={feature} className="flex items-center gap-3 text-xs font-semibold text-arca-text-secondary"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-arca-success/10 text-arca-success"><Check size={14} /></span>{feature}</p>)}</div><div className="mt-7 flex items-end justify-between border-t border-arca-border pt-5"><div><p className="text-[8px] font-black uppercase tracking-wider text-arca-text-dim">Desde</p><p className="mt-1 text-xl font-black text-arca-text-primary">{copy.price}</p></div><Sparkles size={22} className="text-arca-accent" /></div><button type="button" onClick={onViewPlans} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-black">Ver planes y activar <ArrowRight size={17} /></button></div></section></div>;
}
