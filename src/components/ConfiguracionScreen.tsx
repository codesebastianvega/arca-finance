import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Bell, 
  Trash2,
  Home,
  Gamepad2,
  HeartPulse,
  Zap,
  Palette,
  ChevronRight,
  Check,
  ShieldCheck,
  Settings2,
  Sparkles,
  Briefcase,
  Wallet,
  ShoppingBag,
  Coffee,
  Bus,
  Shirt,
  Dog,
  Baby,
  Smile,
  Dumbbell,
  GraduationCap,
  Scissors,
  Utensils,
  Car,
  MoreHorizontal,
  Bot,
  CalendarClock,
  MessageCircle,
  X,
  LogOut,
  BadgeDollarSign,
  Pencil,
  Plus,
  CreditCard,
  Mail,
  KeyRound,
} from 'lucide-react';
import { haptics } from '../lib/haptics';
import type { AppUserSummary, ThemeId } from '../App';
import type { RegisterOption, RegisterViewModel } from '../lib/register-data';
import {
  createBusinessUnit,
  createExpenseCategory,
  createIncomeSource,
  deleteBusinessUnit,
  deleteExpenseCategory,
  deleteIncomeSource,
  updateBusinessUnit,
  updateExpenseCategory,
  updateIncomeSource,
} from '@/app/actions';
import {
  DEFAULT_NOVA_PREFERENCES,
  NOVA_PREFERENCES_KEY,
  normalizeNovaPreferences,
  type NovaPreferences,
} from '../lib/nova-preferences';

const AVAILABLE_ICONS = [
  { name: 'shopping-bag', icon: ShoppingBag },
  { name: 'coffee', icon: Coffee },
  { name: 'bus', icon: Bus },
  { name: 'shirt', icon: Shirt },
  { name: 'dog', icon: Dog },
  { name: 'baby', icon: Baby },
  { name: 'smile', icon: Smile },
  { name: 'dumbbell', icon: Dumbbell },
  { name: 'graduation-cap', icon: GraduationCap },
  { name: 'scissors', icon: Scissors },
  { name: 'utensils', icon: Utensils },
  { name: 'home', icon: Home },
  { name: 'car', icon: Car },
  { name: 'gamepad', icon: Gamepad2 },
  { name: 'heart', icon: HeartPulse },
];

function iconForCategory(label: string, iconName?: string | null) {
  if (iconName) {
    const found = AVAILABLE_ICONS.find(i => i.name === iconName);
    if (found) return found.icon;
  }
  const normalized = label.toLowerCase();
  if (normalized.includes('hogar') || normalized.includes('arriendo')) return Home;
  if (normalized.includes('comida') || normalized.includes('mercado')) return Utensils;
  if (normalized.includes('transporte') || normalized.includes('gasolina')) return Car;
  if (normalized.includes('ocio') || normalized.includes('entreten')) return Gamepad2;
  if (normalized.includes('salud') || normalized.includes('medic')) return HeartPulse;
  if (normalized.includes('servicio') || normalized.includes('luz') || normalized.includes('agua') || normalized.includes('internet')) return Zap;
  return MoreHorizontal;
}

const THEMES: { id: ThemeId; name: string; description: string; colors: [string, string, string, string]; accent: string }[] = [
  { 
    id: 'arca-dark', 
    name: 'Bronce', 
    description: 'Clásico y elegante', 
    colors: ['#0A0805', '#1E1610', '#C68A45', '#F3ECDC'],
    accent: '#C68A45',
  },
  { 
    id: 'neon-night', 
    name: 'Neon', 
    description: 'Cyberpunk premium', 
    colors: ['#07080E', '#141624', '#6C5CE7', '#E4E8F7'],
    accent: '#6C5CE7',
  },
  { 
    id: 'glass-ocean', 
    name: 'Océano', 
    description: 'Cristal marino', 
    colors: ['#050A0F', '#0F1E2E', '#0EA5E9', '#E0F0FF'],
    accent: '#0EA5E9',
  },
  { 
    id: 'arca-light', 
    name: 'Claro', 
    description: 'Modo día', 
    colors: ['#F8F2E4', '#FFFDF8', '#A9713C', '#2A2117'],
    accent: '#A9713C',
  },
];

type ManagerView = 'units' | 'income' | 'categories' | null;
type EditorState = {
  id?: string;
  name: string;
  key: string;
  unitKey: string;
  accountId: string;
  parentId: string;
};

const EMPTY_EDITOR: EditorState = {
  name: '',
  key: '',
  unitKey: '',
  accountId: '',
  parentId: '',
};

export default function ConfiguracionScreen({ onBack, theme, setTheme, data, user }: { onBack: () => void; theme: ThemeId; setTheme: (t: ThemeId) => void; data: RegisterViewModel; user: AppUserSummary }) {
  const router = useRouter();
  const [novaPreferences, setNovaPreferences] = useState<NovaPreferences>(DEFAULT_NOVA_PREFERENCES);
  const [managerView, setManagerView] = useState<ManagerView>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const storedNovaPreferences = window.localStorage.getItem(NOVA_PREFERENCES_KEY);
      if (storedNovaPreferences) {
        setNovaPreferences(normalizeNovaPreferences(JSON.parse(storedNovaPreferences)));
      }
    } catch {
      // Local preferences are optional; keep safe defaults if storage is unavailable.
    }
  }, []);

  const updateNovaPreferences = (next: Partial<NovaPreferences>) => {
    haptics.light();
    setNovaPreferences((current) => {
      const updated = { ...current, ...next };
      try {
        window.localStorage.setItem(NOVA_PREFERENCES_KEY, JSON.stringify(updated));
      } catch {
        // The UI can still keep the preference for the current session.
      }
      return updated;
    });
  };

  const handleDeleteCategory = (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar esta categoría?")) return;
    haptics.medium();
    startTransition(() => { void deleteExpenseCategory(id).then(() => router.refresh()).catch((error: Error) => alert(error.message || "No se pudo eliminar la categoría.")); });
  };

  const handleDeleteUnit = (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este frente de negocio?")) return;
    haptics.medium();
    startTransition(() => { void deleteBusinessUnit(id).then(() => router.refresh()).catch((error: Error) => alert(error.message || "No se pudo eliminar el frente.")); });
  };

  const handleDeleteSource = (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este concepto de ingreso?")) return;
    haptics.medium();
    startTransition(() => { void deleteIncomeSource(id).then(() => router.refresh()).catch((error: Error) => alert(error.message || "No se pudo eliminar el concepto.")); });
  };

  const openManager = (view: Exclude<ManagerView, null>) => {
    setEditor(null);
    setManagerView(view);
  };

  const saveEditor = () => {
    if (!managerView || !editor?.name.trim()) return;

    startTransition(() => {
      const mutation = managerView === 'units'
        ? editor.id
          ? updateBusinessUnit({ id: editor.id, name: editor.name, key: editor.key })
          : createBusinessUnit({ name: editor.name, key: editor.key || editor.name })
        : managerView === 'income'
          ? editor.id
            ? updateIncomeSource({ id: editor.id, name: editor.name, businessUnitKey: editor.unitKey, defaultAccountId: editor.accountId })
            : createIncomeSource({ name: editor.name, businessUnitKey: editor.unitKey, defaultAccountId: editor.accountId })
          : editor.id
            ? updateExpenseCategory({ id: editor.id, name: editor.name, parentId: editor.parentId || null })
            : createExpenseCategory({ name: editor.name, parentId: editor.parentId || null });

      void mutation
        .then(() => {
          setEditor(null);
          router.refresh();
        })
        .catch((error: Error) => alert(error.message || 'No se pudo guardar el cambio.'));
    });
  };

  const currentTheme = THEMES.find(t => t.id === theme) ?? THEMES[0];

  // We combine the database categories here to render them all. The defaults won't have an ID that we can delete.
  const dbCategories = data.categories.map((category) => ({
    id: category.id,
    label: category.label,
    value: category.value,
    parentId: category.parentId ?? '',
    icon: iconForCategory(category.label, category.icon),
    isCustom: true
  }));

  const managerTitle = managerView === 'units'
    ? 'Unidades de negocio'
    : managerView === 'income'
      ? 'Conceptos de ingreso'
      : 'Categorías de gasto';

  return (
    <div className="relative space-y-7 overflow-hidden pb-8">
      <header className="flex items-center gap-4">
        <button onClick={onBack} aria-label="Volver" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-arca-surface-2 text-arca-text-dim transition-colors hover:text-arca-accent">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-arca-accent">Tu espacio</p>
          <h2 className="text-xl font-black text-arca-text-primary">Configuración</h2>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-arca-border p-5"
        style={{ background: `linear-gradient(135deg, ${currentTheme.accent}15 0%, transparent 60%)` }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-[50px] opacity-30" style={{ backgroundColor: currentTheme.accent }} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-arca-accent/30 bg-arca-accent/10 text-lg font-black text-arca-accent">
            {user.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-base font-bold text-arca-text-primary">{user.fullName}</h3>
            <p className="text-[11px] text-arca-text-dim font-medium truncate">{user.email}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-arca-accent/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-arca-accent">
              <Sparkles size={10} /> {user.planLabel}
            </span>
            {typeof user.trialDaysRemaining === 'number' ? (
              <p className="mt-1.5 text-[10px] font-semibold text-arca-text-dim">
                {user.trialDaysRemaining > 0 ? `${user.trialDaysRemaining} días restantes de prueba` : 'La prueba ha finalizado'}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <button onClick={() => setIsPlanOpen(true)} className="flex w-full items-center justify-between rounded-3xl border border-arca-accent/30 bg-arca-accent/[0.07] p-4 text-left transition-colors hover:bg-arca-accent/10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-arca-accent/15 text-arca-accent"><CreditCard size={20} /></div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-arca-accent">Plan y facturación</p>
            <p className="mt-1 text-sm font-bold text-arca-text-primary">{user.planLabel}</p>
            <p className="mt-0.5 text-[10px] text-arca-text-dim">Consulta tu nivel y los próximos planes</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-arca-accent" />
      </button>

      <section className="space-y-3">
        <SectionHeading icon={Bot} eyebrow="Asistente" title="Cómo trabaja Nova" />
        <div className="overflow-hidden rounded-3xl border border-arca-border bg-arca-surface-1">
          <div className="border-b border-arca-border p-4">
            <p className="text-xs font-semibold text-arca-text-primary">Nivel de autonomía</p>
            <p className="mt-1 text-[10px] leading-relaxed text-arca-text-dim">Elige cuánto puede avanzar Nova antes de pedirte confirmación.</p>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-arca-surface-2 p-1">
              {([
                ['guide', 'Orienta'],
                ['prepare', 'Prepara'],
                ['execute', 'Ejecuta'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => updateNovaPreferences({ autonomy: value })}
                  className={`rounded-xl px-2 py-2.5 text-[10px] font-bold transition-colors ${novaPreferences.autonomy === value ? 'bg-arca-accent text-black' : 'text-arca-text-dim'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-arca-text-dim">
              {novaPreferences.autonomy === 'guide' && 'Nova recomienda y tú realizas cada acción.'}
              {novaPreferences.autonomy === 'prepare' && 'Nova deja las acciones listas para que las confirmes.'}
              {novaPreferences.autonomy === 'execute' && 'Nova ejecuta tareas seguras; el dinero siempre requiere confirmación.'}
            </p>
          </div>
          <PreferenceToggle
            icon={CalendarClock}
            label="Resumen semanal"
            description="Prioridades, vencimientos y saldo esperado"
            checked={novaPreferences.weeklySummary}
            onChange={() => updateNovaPreferences({ weeklySummary: !novaPreferences.weeklySummary })}
          />
          <PreferenceToggle
            icon={Bell}
            label="Alertas de vencimiento"
            description="Avisos antes de que un pago se atrase"
            checked={novaPreferences.dueReminders}
            onChange={() => updateNovaPreferences({ dueReminders: !novaPreferences.dueReminders })}
          />
          <div className="flex items-center justify-between border-t border-arca-border px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-arca-surface-2 text-arca-text-secondary"><BadgeDollarSign size={17} /></div>
              <div>
                <p className="text-xs font-semibold text-arca-text-primary">Movimientos de dinero</p>
                <p className="text-[9px] text-arca-text-dim">Pagos y transferencias</p>
              </div>
            </div>
            <span className="rounded-full bg-arca-success/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-arca-success">Siempre confirma</span>
          </div>
          <div className="border-t border-arca-border p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-arca-text-primary"><MessageCircle size={15} className="text-arca-accent" /> Estilo de respuesta</div>
            <div className="grid grid-cols-3 gap-2">
              {([['clear', 'Claro'], ['brief', 'Breve'], ['coach', 'Consejero']] as const).map(([value, label]) => (
                <button key={value} onClick={() => updateNovaPreferences({ tone: value })} className={`rounded-xl border px-2 py-2 text-[9px] font-bold ${novaPreferences.tone === value ? 'border-arca-accent bg-arca-accent/10 text-arca-accent' : 'border-arca-border text-arca-text-dim'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading icon={Palette} eyebrow="Apariencia" title="Tema visual" />
        <div className="grid grid-cols-4 gap-2">
          {THEMES.map((t) => {
            const isActive = t.id === theme;
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => { haptics.medium(); setTheme(t.id); }}
                aria-label={`Usar tema ${t.name}`}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border p-2.5 transition-all ${
                  isActive 
                    ? 'border-arca-accent shadow-lg' 
                    : 'border-arca-border hover:border-arca-border-strong'
                }`}
                style={isActive ? { boxShadow: `0 4px 20px -4px ${t.accent}50` } : {}}
              >
                <div className="w-full aspect-[3/4] rounded-lg overflow-hidden relative" style={{ backgroundColor: t.colors[0] }}>
                  <div className="absolute top-1.5 left-1.5 right-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.colors[1] }} />
                  <div className="absolute top-4 left-1.5 w-3/5 h-1 rounded-full" style={{ backgroundColor: t.colors[3], opacity: 0.4 }} />
                  <div className="absolute bottom-3 left-1.5 right-1.5 h-2.5 rounded" style={{ backgroundColor: t.colors[2], opacity: 0.6 }} />
                  <div className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded" style={{ backgroundColor: t.colors[1] }} />
                  <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full blur-[8px] opacity-50" style={{ backgroundColor: t.colors[2] }} />
                </div>
                <span className="text-[10px] font-bold text-arca-text-primary">{t.name}</span>
                {isActive && (
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-arca-accent flex items-center justify-center shadow-lg"
                  >
                    <Check size={12} className="text-white" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading icon={Settings2} eyebrow="Tus datos" title="Organización financiera" />
        <div className="overflow-hidden rounded-2xl border border-arca-border divide-y divide-arca-border">
          <ManagerRow icon={Briefcase} label="Unidades de negocio" description="Proyectos, frentes o actividades" count={data.units.length} onClick={() => openManager('units')} />
          <ManagerRow icon={Wallet} label="Conceptos de ingreso" description="Nómina, contratos y otros cobros" count={data.incomeSources.length} onClick={() => openManager('income')} />
          <ManagerRow icon={Settings2} label="Categorías de gasto" description="Clasifica en qué sale tu dinero" count={dbCategories.length} onClick={() => openManager('categories')} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading icon={ShieldCheck} eyebrow="Privacidad" title="Cuenta y seguridad" />
        <div className="rounded-2xl border border-arca-border overflow-hidden divide-y divide-arca-border">
          <div className="flex w-full items-center justify-between bg-arca-surface-1 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-arca-surface-2 text-arca-text-secondary"><Mail size={18} /></div>
              <div className="text-left">
                <span className="block text-sm font-semibold text-arca-text-primary">Cuenta de acceso</span>
                <span className="block max-w-[220px] truncate text-[9px] font-bold uppercase tracking-wider text-arca-text-dim">{user.email}</span>
              </div>
            </div>
            <span className="rounded-full bg-arca-success/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-arca-success">Google</span>
          </div>

          <div className="flex items-center justify-between bg-arca-surface-1 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-arca-surface-2 text-arca-text-secondary"><KeyRound size={18} /></div>
              <div><p className="text-sm font-semibold text-arca-text-primary">Protección de la cuenta</p><p className="text-[9px] font-bold uppercase tracking-wider text-arca-text-dim">Autenticación administrada por Google</p></div>
            </div>
            <ShieldCheck size={17} className="text-arca-success" />
          </div>
          <a href="/auth/sign-out" className="flex w-full items-center gap-3 bg-arca-surface-1 p-4 text-arca-alert transition-colors hover:bg-arca-alert/5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-arca-alert/10"><LogOut size={18} /></div>
            <span className="text-sm font-semibold">Cerrar sesión</span>
          </a>
        </div>
      </section>

      <div className="py-4 text-center space-y-1">
        <p className="text-[9px] font-bold text-arca-text-dim uppercase tracking-widest">Arca Finanzas · Versión 2.4</p>
        <p className="text-[8px] text-arca-text-dim">Tus decisiones, más claras con Nova.</p>
      </div>

      <AnimatePresence>
        {managerView && (
          <motion.div className="fixed inset-0 z-[550] flex items-end bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setManagerView(null)}>
            <motion.section
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={(event) => event.stopPropagation()}
              className="max-h-[82dvh] w-full overflow-y-auto rounded-t-[28px] border border-b-0 border-arca-border bg-arca-bg px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5"
            >
              <div className="mb-5 flex items-start justify-between">
                <div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-arca-accent">Gestionar</p><h3 className="mt-1 text-xl font-black text-arca-text-primary">{managerTitle}</h3></div>
                <div className="flex gap-2">
                  <button onClick={() => setEditor({ ...EMPTY_EDITOR, unitKey: data.units[0]?.value ?? '', accountId: data.accounts[0]?.id ?? '' })} aria-label={`Agregar en ${managerTitle}`} className="flex h-10 items-center gap-1.5 rounded-full bg-arca-accent px-3 text-[10px] font-black uppercase tracking-wider text-black"><Plus size={15} /> Agregar</button>
                  <button onClick={() => setManagerView(null)} aria-label="Cerrar gestor" className="flex h-10 w-10 items-center justify-center rounded-full bg-arca-surface-2 text-arca-text-dim"><X size={18} /></button>
                </div>
              </div>

              {editor && (
                <OrganizationEditor
                  view={managerView}
                  value={editor}
                  units={data.units}
                  accounts={data.accounts}
                  categories={data.categories.filter((category) => category.id !== editor.id)}
                  pending={isPending}
                  onChange={setEditor}
                  onCancel={() => setEditor(null)}
                  onSave={saveEditor}
                />
              )}

              {!editor && managerView === 'units' && <ManagerList empty="No tienes unidades de negocio registradas.">{data.units.map((unit) => <ManagerItem key={unit.id} title={unit.label} subtitle={unit.value} onEdit={() => setEditor({ ...EMPTY_EDITOR, id: unit.id, name: unit.label, key: unit.value })} onDelete={() => handleDeleteUnit(unit.id)} disabled={isPending} />)}</ManagerList>}
              {!editor && managerView === 'income' && <ManagerList empty="No tienes conceptos de ingreso registrados.">{data.incomeSources.map((source) => <ManagerItem key={source.id} title={source.label} subtitle={source.unitKey} onEdit={() => setEditor({ ...EMPTY_EDITOR, id: source.id, name: source.label, unitKey: source.unitKey, accountId: source.defaultAccountId ?? '' })} onDelete={() => handleDeleteSource(source.id)} disabled={isPending} />)}</ManagerList>}
              {!editor && managerView === 'categories' && <ManagerList empty="No tienes categorías personalizadas.">{dbCategories.map((category) => <ManagerItem key={category.id} title={category.label} onEdit={() => setEditor({ ...EMPTY_EDITOR, id: category.id, name: category.label, parentId: category.parentId })} onDelete={() => handleDeleteCategory(category.id)} disabled={isPending} />)}</ManagerList>}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPlanOpen && (
          <motion.div className="fixed inset-0 z-[560] flex items-end bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPlanOpen(false)}>
            <motion.section initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} onClick={(event) => event.stopPropagation()} className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[30px] border border-b-0 border-arca-border bg-arca-bg px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5">
              <div className="mb-5 flex items-start justify-between">
                <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Tu suscripción</p><h3 className="mt-1 text-xl font-black text-arca-text-primary">Plan y facturación</h3></div>
                <button onClick={() => setIsPlanOpen(false)} aria-label="Cerrar planes" className="flex h-10 w-10 items-center justify-center rounded-full bg-arca-surface-2 text-arca-text-dim"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <PlanOption name="Arca Gratis" description="Control financiero esencial y registro manual. No incluye Nova." current={user.planLabel.toLowerCase().includes('gratuito')} />
                <PlanOption name="Personal Pro" description="La experiencia personal automatizada y acompañada por Nova." current={user.planLabel.toLowerCase().includes('personal')} />
                <PlanOption name="Arca Business" description="Operación financiera para negocios, proyectos y equipos." current={user.planLabel.toLowerCase().includes('business')} />
              </div>
              <div className="mt-4 rounded-2xl border border-arca-border bg-arca-surface-1 p-4">
                <p className="text-xs font-bold text-arca-text-primary">Estamos definiendo el lanzamiento</p>
                <p className="mt-1 text-[10px] leading-relaxed text-arca-text-dim">Los precios y el detalle definitivo de funciones se publicarán aquí. Por ahora no se realizarán cobros ni cambios de plan desde la aplicación.</p>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title }: { icon: React.ComponentType<{ size?: number }>; eyebrow: string; title: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><Icon size={15} /></div>
      <div>
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-arca-text-dim">{eyebrow}</p>
        <h3 className="text-sm font-bold text-arca-text-primary">{title}</h3>
      </div>
    </div>
  );
}

function PreferenceToggle({ icon: Icon, label, description, checked, onChange }: { icon: React.ComponentType<{ size?: number }>; label: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={checked} className="flex w-full items-center justify-between border-b border-arca-border px-4 py-3.5 text-left">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-arca-surface-2 text-arca-text-secondary"><Icon size={17} /></div>
        <div><p className="text-xs font-semibold text-arca-text-primary">{label}</p><p className="text-[9px] text-arca-text-dim">{description}</p></div>
      </div>
      <div className={`h-6 w-11 rounded-full p-0.5 transition-colors ${checked ? 'bg-arca-accent' : 'bg-arca-surface-2 ring-1 ring-arca-border'}`}><motion.div animate={{ x: checked ? 20 : 0 }} className="h-5 w-5 rounded-full bg-white shadow" /></div>
    </button>
  );
}

function ManagerRow({ icon: Icon, label, description, count, onClick }: { icon: React.ComponentType<{ size?: number }>; label: string; description: string; count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between bg-arca-surface-1 p-4 text-left transition-colors hover:bg-arca-surface-2">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-arca-surface-2 text-arca-accent"><Icon size={18} /></div><div><p className="text-sm font-semibold text-arca-text-primary">{label}</p><p className="text-[9px] text-arca-text-dim">{description}</p></div></div>
      <div className="flex items-center gap-2"><span className="rounded-full bg-arca-surface-2 px-2 py-1 text-[9px] font-bold text-arca-text-secondary">{count}</span><ChevronRight size={16} className="text-arca-text-dim" /></div>
    </button>
  );
}

function ManagerList({ children, empty }: { children: React.ReactNode; empty: string }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return hasItems ? <div className="space-y-2">{children}</div> : <p className="rounded-2xl border border-arca-border bg-arca-surface-1 p-6 text-center text-sm text-arca-text-dim">{empty}</p>;
}

function ManagerItem({ title, subtitle, onEdit, onDelete, disabled }: { title: string; subtitle?: string; onEdit: () => void; onDelete: () => void; disabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-arca-border bg-arca-surface-1 p-4">
      <div className="min-w-0"><p className="truncate text-sm font-semibold text-arca-text-primary">{title}</p>{subtitle && <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-arca-text-dim">{subtitle}</p>}</div>
      <div className="ml-3 flex shrink-0 gap-2">
        <button onClick={onEdit} disabled={disabled} aria-label={`Editar ${title}`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-arca-surface-2 text-arca-text-secondary disabled:opacity-40"><Pencil size={14} /></button>
        <button onClick={onDelete} disabled={disabled} aria-label={`Eliminar ${title}`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-arca-alert/10 text-arca-alert disabled:opacity-40"><Trash2 size={15} /></button>
      </div>
    </div>
  );
}

function OrganizationEditor({ view, value, units, accounts, categories, pending, onChange, onCancel, onSave }: {
  view: Exclude<ManagerView, null>;
  value: EditorState;
  units: RegisterOption[];
  accounts: RegisterOption[];
  categories: RegisterOption[];
  pending: boolean;
  onChange: (value: EditorState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const inputClass = 'mt-1.5 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-3 py-3 text-sm text-arca-text-primary outline-none focus:border-arca-accent';
  const labelClass = 'text-[9px] font-black uppercase tracking-[0.16em] text-arca-text-dim';

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave(); }} className="mb-4 space-y-4 rounded-2xl border border-arca-accent/30 bg-arca-accent/[0.05] p-4">
      <div>
        <p className="text-xs font-bold text-arca-text-primary">{value.id ? 'Editar elemento' : 'Nuevo elemento'}</p>
        <p className="mt-1 text-[9px] text-arca-text-dim">Los cambios se reflejarán en registros, filtros y reportes.</p>
      </div>
      <label className="block"><span className={labelClass}>Nombre</span><input autoFocus required value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} className={inputClass} placeholder={view === 'units' ? 'Ej. SIE Travel' : view === 'income' ? 'Ej. Nómina' : 'Ej. Alimentación'} /></label>
      {view === 'units' && (
        <label className="block"><span className={labelClass}>Clave interna</span><input required disabled={Boolean(value.id)} value={value.key} onChange={(event) => onChange({ ...value, key: event.target.value })} className={`${inputClass} disabled:opacity-50`} placeholder="ej. sie-travel" /><span className="mt-1 block text-[9px] text-arca-text-dim">Al editar se conserva para no romper movimientos anteriores.</span></label>
      )}
      {view === 'income' && (
        <>
          <label className="block"><span className={labelClass}>Unidad de negocio</span><select required value={value.unitKey} onChange={(event) => onChange({ ...value, unitKey: event.target.value })} className={inputClass}><option value="">Selecciona una unidad</option>{units.map((unit) => <option key={unit.id} value={unit.value}>{unit.label}</option>)}</select></label>
          <label className="block"><span className={labelClass}>Cuenta predeterminada</span><select required value={value.accountId} onChange={(event) => onChange({ ...value, accountId: event.target.value })} className={inputClass}><option value="">Selecciona una cuenta</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}</select></label>
        </>
      )}
      {view === 'categories' && (
        <label className="block"><span className={labelClass}>Categoría superior</span><select value={value.parentId} onChange={(event) => onChange({ ...value, parentId: event.target.value })} className={inputClass}><option value="">Sin categoría superior</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
      )}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={pending} className="flex-1 rounded-xl border border-arca-border py-3 text-xs font-bold text-arca-text-secondary">Cancelar</button>
        <button type="submit" disabled={pending || !value.name.trim()} className="flex-1 rounded-xl bg-arca-accent py-3 text-xs font-black text-black disabled:opacity-50">{pending ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}

function PlanOption({ name, description, current }: { name: string; description: string; current: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${current ? 'border-arca-accent bg-arca-accent/[0.08]' : 'border-arca-border bg-arca-surface-1'}`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-bold text-arca-text-primary">{name}</p><p className="mt-1 text-[10px] leading-relaxed text-arca-text-dim">{description}</p></div>
        {current ? <span className="shrink-0 rounded-full bg-arca-accent px-2 py-1 text-[8px] font-black uppercase tracking-wider text-black">Actual</span> : <span className="shrink-0 rounded-full bg-arca-surface-2 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-arca-text-dim">Próximamente</span>}
      </div>
    </div>
  );
}
