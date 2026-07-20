import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Archive,
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
  Copy,
  ExternalLink,
  Mail,
  KeyRound,
} from 'lucide-react';
import { haptics } from '../lib/haptics';
import type { AppUserSummary, ThemeId } from '../App';
import type { RegisterOption, RegisterViewModel } from '../lib/register-data';
import {
  archiveAccount,
  archiveCreditCard,
  archiveBankCredit,
  archiveBusinessUnit,
  createAccount,
  createBusinessUnit,
  createCreditCard,
  createBankCredit,
  createExpenseCategory,
  createIncomeSource,
  deleteExpenseCategory,
  deleteIncomeSource,
  updateBusinessUnit,
  updateAccountDetails,
  updateCreditCardDetails,
  updateBankCreditDetails,
  updateExpenseCategory,
  updateIncomeSource,
} from '@/app/actions';
import {
  DEFAULT_NOVA_PREFERENCES,
  NOVA_PREFERENCES_KEY,
  normalizeNovaPreferences,
  type NovaPreferences,
} from '../lib/nova-preferences';
import { ARCA_MANUAL_PAYMENT, buildPaymentProofWhatsAppUrl, type BillingPlan } from '../lib/billing';
import { requestSubscriptionPayment } from '@/app/billing-actions';

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

type ManagerView = 'accounts' | 'cards' | 'credits' | 'units' | 'income' | 'categories' | null;
type EditorState = {
  id?: string;
  name: string;
  key: string;
  unitKey: string;
  accountId: string;
  parentId: string;
  entity: string;
  type: string;
  balance: string;
  color: string;
  issuer: string;
  limitValue: string;
  used: string;
  cutOffDate: string;
  payDueDate: string;
  minimumPayment: string;
  annualInterestRate: string;
  interestType: string;
  estimatedPayoffMonths: string;
  estimatedTotalPayment: string;
  paymentStrategy: string;
  notes: string;
  totalAmount: string;
  currentBalance: string;
  monthlyPayment: string;
  interestRate: string;
  totalInstallments: string;
  paidInstallments: string;
};

const EMPTY_EDITOR: EditorState = {
  name: '',
  key: '',
  unitKey: '',
  accountId: '',
  parentId: '',
  entity: '',
  type: 'Ahorros',
  balance: '0',
  color: '#C68A45',
  issuer: '',
  limitValue: '0',
  used: '0',
  cutOffDate: '1',
  payDueDate: '1',
  minimumPayment: '0',
  annualInterestRate: '',
  interestType: 'EA',
  estimatedPayoffMonths: '',
  estimatedTotalPayment: '',
  paymentStrategy: 'minimum',
  notes: '',
  totalAmount: '0',
  currentBalance: '0',
  monthlyPayment: '0',
  interestRate: '',
  totalInstallments: '1',
  paidInstallments: '0',
};

export default function ConfiguracionScreen({ onBack, theme, setTheme, data, user, plans }: { onBack: () => void; theme: ThemeId; setTheme: (t: ThemeId) => void; data: RegisterViewModel; user: AppUserSummary; plans: BillingPlan[] }) {
  const router = useRouter();
  const [novaPreferences, setNovaPreferences] = useState<NovaPreferences>(DEFAULT_NOVA_PREFERENCES);
  const [managerView, setManagerView] = useState<ManagerView>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<'personal_pro' | 'business'>(user.planCode === 'business' ? 'business' : 'personal_pro');
  const [paymentKeyCopied, setPaymentKeyCopied] = useState(false);
  const [paymentRequestPending, setPaymentRequestPending] = useState(false);
  const [paymentRequestMessage, setPaymentRequestMessage] = useState('');
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
    if (!window.confirm("¿Quieres archivar este proyecto? Sus movimientos conservarán su historial.")) return;
    haptics.medium();
    startTransition(() => { void archiveBusinessUnit(id).then(() => router.refresh()).catch((error: Error) => alert(error.message || "No se pudo archivar el proyecto.")); });
  };

  const handleArchiveAccount = (id: string) => {
    if (!window.confirm("¿Quieres archivar esta cuenta? Debe estar en $0 y no puede ser tu única cuenta activa.")) return;
    haptics.medium();
    startTransition(() => {
      void archiveAccount(id)
        .then(() => router.refresh())
        .catch((error: Error) => alert(error.message || "No se pudo archivar la cuenta."));
    });
  };

  const handleArchiveCard = (id: string) => {
    if (!window.confirm("¿Quieres archivar esta tarjeta? Solo se puede hacer cuando su deuda esté en $0.")) return;
    haptics.medium();
    startTransition(() => {
      void archiveCreditCard(id)
        .then(() => router.refresh())
        .catch((error: Error) => alert(error.message || "No se pudo archivar la tarjeta."));
    });
  };

  const handleArchiveCredit = (id: string) => {
    if (!window.confirm("¿Quieres archivar este crédito? Solo se puede hacer cuando su saldo pendiente esté en $0.")) return;
    haptics.medium();
    startTransition(() => {
      void archiveBankCredit(id)
        .then(() => router.refresh())
        .catch((error: Error) => alert(error.message || "No se pudo archivar el crédito."));
    });
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
      const mutation = managerView === 'accounts'
        ? editor.id
          ? updateAccountDetails({ id: editor.id, name: editor.name, entity: editor.entity, type: editor.type, color: editor.color })
          : createAccount({ name: editor.name, entity: editor.entity, type: editor.type, balance: Number(editor.balance || 0), color: editor.color })
        : managerView === 'cards'
          ? editor.id
            ? updateCreditCardDetails({
                id: editor.id,
                name: editor.name,
                issuer: editor.issuer,
                limitValue: Number(editor.limitValue || 0),
                cutOffDate: Number(editor.cutOffDate || 1),
                payDueDate: Number(editor.payDueDate || 1),
                minimumPayment: Number(editor.minimumPayment || 0),
                annualInterestRate: editor.annualInterestRate ? Number(editor.annualInterestRate) : null,
                interestType: editor.interestType,
                estimatedPayoffMonths: editor.estimatedPayoffMonths ? Number(editor.estimatedPayoffMonths) : null,
                estimatedTotalPayment: editor.estimatedTotalPayment ? Number(editor.estimatedTotalPayment) : null,
                paymentStrategy: editor.paymentStrategy,
                notes: editor.notes,
              })
            : createCreditCard({
                name: editor.name,
                issuer: editor.issuer,
                limitValue: Number(editor.limitValue || 0),
                used: Number(editor.used || 0),
                cutOffDate: Number(editor.cutOffDate || 1),
                payDueDate: Number(editor.payDueDate || 1),
                minimumPayment: Number(editor.minimumPayment || 0),
                annualInterestRate: editor.annualInterestRate ? Number(editor.annualInterestRate) : null,
                interestType: editor.interestType,
                estimatedPayoffMonths: editor.estimatedPayoffMonths ? Number(editor.estimatedPayoffMonths) : null,
                estimatedTotalPayment: editor.estimatedTotalPayment ? Number(editor.estimatedTotalPayment) : null,
                paymentStrategy: editor.paymentStrategy,
                notes: editor.notes,
              })
          : managerView === 'credits'
            ? editor.id
              ? updateBankCreditDetails({
                  id: editor.id,
                  name: editor.name,
                  totalAmount: Number(editor.totalAmount || 0),
                  monthlyPayment: Number(editor.monthlyPayment || 0),
                  interestRate: editor.interestRate ? Number(editor.interestRate) : null,
                  totalInstallments: Number(editor.totalInstallments || 1),
                  payDueDate: Number(editor.payDueDate || 1),
                  notes: editor.notes,
                })
              : createBankCredit({
                  name: editor.name,
                  totalAmount: Number(editor.totalAmount || 0),
                  currentBalance: Number(editor.currentBalance || 0),
                  monthlyPayment: Number(editor.monthlyPayment || 0),
                  interestRate: editor.interestRate ? Number(editor.interestRate) : null,
                  totalInstallments: Number(editor.totalInstallments || 1),
                  paidInstallments: Number(editor.paidInstallments || 0),
                  payDueDate: Number(editor.payDueDate || 1),
                  notes: editor.notes,
                })
          : managerView === 'units'
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
  const selectedPaymentPlan = plans.find((plan) => plan.code === selectedPlanCode) ?? plans.find((plan) => plan.code === 'personal_pro');
  const openPaymentProof = async () => {
    if (!selectedPaymentPlan || selectedPaymentPlan.code === 'free') return;
    const whatsappWindow = window.open('about:blank', '_blank');
    if (whatsappWindow) whatsappWindow.opener = null;
    setPaymentRequestPending(true);
    setPaymentRequestMessage('');
    try {
      const request = await requestSubscriptionPayment({ planCode: selectedPaymentPlan.code });
      const url = buildPaymentProofWhatsAppUrl({ fullName: user.fullName, email: user.email, planLabel: selectedPaymentPlan.name, amountCop: request.amountCop, invoiceId: request.invoiceId });
      if (whatsappWindow) whatsappWindow.location.href = url;
      else window.location.href = url;
      setPaymentRequestMessage('Solicitud registrada. Envía el comprobante para validarla.');
      router.refresh();
    } catch (error) {
      whatsappWindow?.close();
      setPaymentRequestMessage(error instanceof Error ? error.message : 'No pudimos iniciar el pago.');
    } finally {
      setPaymentRequestPending(false);
    }
  };

  const copyPaymentKey = async () => {
    try {
      await navigator.clipboard.writeText(ARCA_MANUAL_PAYMENT.key);
      haptics.light();
      setPaymentKeyCopied(true);
      window.setTimeout(() => setPaymentKeyCopied(false), 1800);
    } catch {
      window.prompt('Copia la llave de pago', ARCA_MANUAL_PAYMENT.key);
    }
  };

  // We combine the database categories here to render them all. The defaults won't have an ID that we can delete.
  const dbCategories = data.categories.map((category) => ({
    id: category.id,
    label: category.label,
    value: category.value,
    parentId: category.parentId ?? '',
    icon: iconForCategory(category.label, category.icon),
    isCustom: true
  }));

  const projectUnits = data.units.filter(
    (unit) => unit.label.toLowerCase() !== 'personal' && !unit.value.startsWith('personal-'),
  );

  const managerTitle = managerView === 'units'
    ? 'Proyectos y actividades'
    : managerView === 'accounts'
      ? 'Cuentas y efectivo'
    : managerView === 'cards'
      ? 'Tarjetas de crédito'
    : managerView === 'credits'
      ? 'Créditos y préstamos bancarios'
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
          <ManagerRow icon={Wallet} label="Cuentas y efectivo" description="Bancos, billeteras y dinero disponible" count={data.accounts.length} onClick={() => openManager('accounts')} />
          <ManagerRow icon={CreditCard} label="Tarjetas de crédito" description="Cupo, deuda, corte y pago mínimo" count={data.creditCards.length} onClick={() => openManager('cards')} />
          <ManagerRow icon={BadgeDollarSign} label="Créditos bancarios" description="Saldo, cuotas, tasa y fecha de pago" count={data.bankCredits.length} onClick={() => openManager('credits')} />
          <ManagerRow icon={Briefcase} label="Proyectos y actividades" description="Separa trabajo o negocios de tus finanzas personales" count={projectUnits.length} onClick={() => openManager('units')} />
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

              {!editor && managerView === 'accounts' && <ManagerList empty="Aún no tienes cuentas activas.">{data.accounts.map((account) => <ManagerItem archive key={account.id} title={account.label} subtitle={`${account.entity || account.meta || 'Cuenta'} · ${formatAccountBalance(account.amount ?? 0)}`} onEdit={() => setEditor({ ...EMPTY_EDITOR, id: account.id, name: account.label, entity: account.entity ?? '', type: normalizeAccountType(account.meta), balance: String(account.amount ?? 0), color: account.color ?? '#C68A45' })} onDelete={() => handleArchiveAccount(account.id)} disabled={isPending} />)}</ManagerList>}
              {!editor && managerView === 'cards' && <ManagerList empty="Aún no tienes tarjetas registradas.">{data.creditCards.map((card) => <ManagerItem archive key={card.id} title={card.name} subtitle={`${card.issuer} · deuda ${formatAccountBalance(card.used)} de ${formatAccountBalance(card.limit)}`} onEdit={() => setEditor({ ...EMPTY_EDITOR, id: card.id, name: card.name, issuer: card.issuer, limitValue: String(card.limit), used: String(card.used), cutOffDate: String(card.cutOffDay), payDueDate: String(card.payDueDay), minimumPayment: String(card.minimumPayment), annualInterestRate: card.annualInterestRate == null ? '' : String(card.annualInterestRate), interestType: card.interestType, estimatedPayoffMonths: card.estimatedPayoffMonths == null ? '' : String(card.estimatedPayoffMonths), estimatedTotalPayment: card.estimatedTotalPayment == null ? '' : String(card.estimatedTotalPayment), paymentStrategy: card.paymentStrategy, notes: card.notes })} onDelete={() => handleArchiveCard(card.id)} disabled={isPending} />)}</ManagerList>}
              {!editor && managerView === 'credits' && <ManagerList empty="Aún no tienes créditos bancarios.">{data.bankCredits.map((credit) => <ManagerItem archive key={credit.id} title={credit.name} subtitle={`${formatAccountBalance(credit.currentBalance)} pendientes · ${credit.paidInstallments} de ${credit.totalInstallments} cuotas`} onEdit={() => setEditor({ ...EMPTY_EDITOR, id: credit.id, name: credit.name, totalAmount: String(credit.totalAmount), currentBalance: String(credit.currentBalance), monthlyPayment: String(credit.monthlyPayment), interestRate: credit.interestRate == null ? '' : String(credit.interestRate), totalInstallments: String(credit.totalInstallments), paidInstallments: String(credit.paidInstallments), payDueDate: String(credit.payDueDay), notes: credit.notes })} onDelete={() => handleArchiveCredit(credit.id)} disabled={isPending} />)}</ManagerList>}
              {!editor && managerView === 'units' && <ManagerList empty="Aún no tienes proyectos. Tus registros seguirán en Personal.">{projectUnits.map((unit) => <ManagerItem archive key={unit.id} title={unit.label} subtitle="Proyecto o actividad" onEdit={() => setEditor({ ...EMPTY_EDITOR, id: unit.id, name: unit.label, key: unit.value })} onDelete={() => handleDeleteUnit(unit.id)} disabled={isPending} />)}</ManagerList>}
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
                {plans.filter((plan) => plan.active || plan.code === user.planCode).map((plan) => <PlanOption key={plan.code} plan={plan} current={user.planCode === plan.code} selected={plan.code === selectedPlanCode} onSelect={() => { if (plan.code !== 'free') setSelectedPlanCode(plan.code); }} />)}
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-arca-accent/30 bg-arca-accent/[0.06]">
                <div className="border-b border-arca-border p-4">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-arca-accent">Pago manual habilitado</p>
                  <div className="mt-1 flex items-end justify-between gap-3"><p className="text-sm font-bold text-arca-text-primary">Paga con la llave de Nu</p><p className="text-sm font-black text-arca-accent">{selectedPaymentPlan ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(selectedPaymentPlan.monthlyPriceCop) : null}</p></div>
                  <p className="mt-1 text-[10px] leading-relaxed text-arca-text-dim">Por ahora este es el único medio de pago de Arca. Después de transferir, envía el comprobante para que validemos tu suscripción.</p>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between rounded-2xl border border-arca-border bg-arca-surface-1 px-4 py-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wider text-arca-text-dim">Llave {ARCA_MANUAL_PAYMENT.provider}</p>
                      <p className="mt-1 text-lg font-black tracking-wide text-arca-text-primary">{ARCA_MANUAL_PAYMENT.key}</p>
                    </div>
                    <button type="button" onClick={copyPaymentKey} className="flex h-10 items-center gap-2 rounded-xl bg-arca-surface-2 px-3 text-[9px] font-black uppercase tracking-wider text-arca-accent" aria-label="Copiar llave de pago">
                      <Copy size={14} /> {paymentKeyCopied ? 'Copiada' : 'Copiar'}
                    </button>
                  </div>
                  <button type="button" disabled={paymentRequestPending} onClick={openPaymentProof} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-xs font-black text-black disabled:opacity-50">
                    {paymentRequestPending ? 'Preparando solicitud…' : 'Enviar comprobante por WhatsApp'} <ExternalLink size={15} />
                  </button>
                  {paymentRequestMessage ? <p className="mt-2 rounded-xl bg-arca-surface-2 px-3 py-2 text-center text-[9px] text-arca-text-secondary">{paymentRequestMessage}</p> : null}
                  <p className="mt-2 text-center text-[9px] text-arca-text-dim">El mensaje se abrirá preparado para {ARCA_MANUAL_PAYMENT.whatsappDisplay}.</p>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-arca-border bg-arca-surface-1 p-4">
                <p className="text-xs font-bold text-arca-text-primary">Activación manual</p>
                <p className="mt-1 text-[10px] leading-relaxed text-arca-text-dim">Cuando validemos el comprobante, activaremos el plan y su nueva fecha de renovación. Recibirás avisos antes del próximo vencimiento.</p>
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

function ManagerItem({ title, subtitle, onEdit, onDelete, disabled, archive = false }: { title: string; subtitle?: string; onEdit: () => void; onDelete: () => void; disabled: boolean; archive?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-arca-border bg-arca-surface-1 p-4">
      <div className="min-w-0"><p className="truncate text-sm font-semibold text-arca-text-primary">{title}</p>{subtitle && <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-arca-text-dim">{subtitle}</p>}</div>
      <div className="ml-3 flex shrink-0 gap-2">
        <button type="button" onClick={onEdit} disabled={disabled} aria-label={`Editar ${title}`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-arca-surface-2 text-arca-text-secondary disabled:opacity-40"><Pencil size={14} /></button>
        <button type="button" onClick={onDelete} disabled={disabled} aria-label={`${archive ? 'Archivar' : 'Eliminar'} ${title}`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-arca-alert/10 text-arca-alert disabled:opacity-40">{archive ? <Archive size={15} /> : <Trash2 size={15} />}</button>
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
      <label className="block"><span className={labelClass}>Nombre</span><input autoFocus required value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} className={inputClass} placeholder={view === 'accounts' ? 'Ej. Cuenta principal' : view === 'cards' ? 'Ej. Visa principal' : view === 'credits' ? 'Ej. Crédito de libre inversión' : view === 'units' ? 'Ej. SIE Travel' : view === 'income' ? 'Ej. Nómina' : 'Ej. Alimentación'} /></label>
      {view === 'accounts' && (
        <>
          <label className="block"><span className={labelClass}>Banco o entidad</span><input value={value.entity} onChange={(event) => onChange({ ...value, entity: event.target.value })} className={inputClass} placeholder="Ej. Nu, Nequi, Bancolombia o Efectivo" /></label>
          <label className="block"><span className={labelClass}>Tipo de cuenta</span><select required value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value })} className={inputClass}><option value="Ahorros">Ahorros</option><option value="Corriente">Corriente</option><option value="Billetera digital">Billetera digital</option><option value="Efectivo">Efectivo</option><option value="Inversión">Inversión</option></select></label>
          {!value.id ? <label className="block"><span className={labelClass}>Saldo inicial</span><input inputMode="numeric" value={value.balance} onChange={(event) => onChange({ ...value, balance: event.target.value.replace(/[^0-9]/g, '') })} className={inputClass} placeholder="0" /><span className="mt-1 block text-[9px] leading-4 text-arca-text-dim">Se registrará como saldo inicial, no como ingreso del mes.</span></label> : <p className="rounded-xl border border-arca-border bg-arca-surface-2 px-3 py-2 text-[9px] leading-4 text-arca-text-dim">El saldo se corrige con movimientos o transferencias para conservar el historial.</p>}
        </>
      )}
      {view === 'cards' && (
        <>
          <label className="block"><span className={labelClass}>Banco o emisor</span><input required value={value.issuer} onChange={(event) => onChange({ ...value, issuer: event.target.value })} className={inputClass} placeholder="Ej. Nu o Bancolombia" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={labelClass}>Cupo total</span><input required inputMode="numeric" value={value.limitValue} onChange={(event) => onChange({ ...value, limitValue: event.target.value.replace(/[^0-9]/g, '') })} className={inputClass} placeholder="0" /></label>
            {!value.id ? <label className="block"><span className={labelClass}>Deuda inicial</span><input required inputMode="numeric" value={value.used} onChange={(event) => onChange({ ...value, used: event.target.value.replace(/[^0-9]/g, '') })} className={inputClass} placeholder="0" /></label> : <div><span className={labelClass}>Deuda actual</span><p className={`${inputClass} cursor-not-allowed opacity-70`}>{formatAccountBalance(Number(value.used || 0))}</p></div>}
          </div>
          {value.id ? <p className="rounded-xl border border-arca-border bg-arca-surface-2 px-3 py-2 text-[9px] leading-4 text-arca-text-dim">La deuda cambia con compras, pagos o ajustes; editar la tarjeta no modifica el historial.</p> : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={labelClass}>Día de corte</span><input required type="number" min="1" max="31" value={value.cutOffDate} onChange={(event) => onChange({ ...value, cutOffDate: event.target.value })} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Día de pago</span><input required type="number" min="1" max="31" value={value.payDueDate} onChange={(event) => onChange({ ...value, payDueDate: event.target.value })} className={inputClass} /></label>
          </div>
          <label className="block"><span className={labelClass}>Pago mínimo mensual</span><input inputMode="numeric" value={value.minimumPayment} onChange={(event) => onChange({ ...value, minimumPayment: event.target.value.replace(/[^0-9]/g, '') })} className={inputClass} placeholder="0" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={labelClass}>Interés anual (%)</span><input inputMode="decimal" value={value.annualInterestRate} onChange={(event) => onChange({ ...value, annualInterestRate: event.target.value.replace(/[^0-9.,]/g, '').replace(',', '.') })} className={inputClass} placeholder="Opcional" /></label>
            <label className="block"><span className={labelClass}>Tipo de tasa</span><select value={value.interestType} onChange={(event) => onChange({ ...value, interestType: event.target.value })} className={inputClass}><option value="EA">Efectiva anual</option><option value="NMV">Mensual vencida</option><option value="unknown">No la sé</option></select></label>
          </div>
          <label className="block"><span className={labelClass}>Estrategia de pago</span><select value={value.paymentStrategy} onChange={(event) => onChange({ ...value, paymentStrategy: event.target.value })} className={inputClass}><option value="minimum">Pago mínimo</option><option value="fixed">Cuota fija</option><option value="full">Pago total</option></select></label>
          <label className="block"><span className={labelClass}>Notas</span><textarea value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} className={`${inputClass} min-h-20 resize-none`} placeholder="Beneficios, condiciones o recordatorios" /></label>
        </>
      )}
      {view === 'credits' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={labelClass}>Monto original</span><input required inputMode="numeric" value={value.totalAmount} onChange={(event) => onChange({ ...value, totalAmount: event.target.value.replace(/[^0-9]/g, '') })} className={inputClass} placeholder="0" /></label>
            {!value.id ? <label className="block"><span className={labelClass}>Saldo pendiente</span><input required inputMode="numeric" value={value.currentBalance} onChange={(event) => onChange({ ...value, currentBalance: event.target.value.replace(/[^0-9]/g, '') })} className={inputClass} placeholder="0" /></label> : <div><span className={labelClass}>Saldo pendiente</span><p className={`${inputClass} cursor-not-allowed opacity-70`}>{formatAccountBalance(Number(value.currentBalance || 0))}</p></div>}
          </div>
          {value.id ? <p className="rounded-xl border border-arca-border bg-arca-surface-2 px-3 py-2 text-[9px] leading-4 text-arca-text-dim">El saldo y las cuotas pagadas cambian al registrar pagos, no al editar el crédito.</p> : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={labelClass}>Cuota mensual</span><input required inputMode="numeric" value={value.monthlyPayment} onChange={(event) => onChange({ ...value, monthlyPayment: event.target.value.replace(/[^0-9]/g, '') })} className={inputClass} placeholder="0" /></label>
            <label className="block"><span className={labelClass}>Día de pago</span><input required type="number" min="1" max="31" value={value.payDueDate} onChange={(event) => onChange({ ...value, payDueDate: event.target.value })} className={inputClass} /></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={labelClass}>Total de cuotas</span><input required type="number" min="1" value={value.totalInstallments} onChange={(event) => onChange({ ...value, totalInstallments: event.target.value })} className={inputClass} /></label>
            {!value.id ? <label className="block"><span className={labelClass}>Cuotas pagadas</span><input required type="number" min="0" value={value.paidInstallments} onChange={(event) => onChange({ ...value, paidInstallments: event.target.value })} className={inputClass} /></label> : <div><span className={labelClass}>Cuotas pagadas</span><p className={`${inputClass} cursor-not-allowed opacity-70`}>{value.paidInstallments}</p></div>}
          </div>
          <label className="block"><span className={labelClass}>Tasa de interés (%)</span><input inputMode="decimal" value={value.interestRate} onChange={(event) => onChange({ ...value, interestRate: event.target.value.replace(/[^0-9.,]/g, '').replace(',', '.') })} className={inputClass} placeholder="Opcional" /></label>
          <label className="block"><span className={labelClass}>Notas</span><textarea value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} className={`${inputClass} min-h-20 resize-none`} placeholder="Entidad, condiciones o recordatorios" /></label>
        </>
      )}
      {view === 'income' && (
        <>
          <label className="block"><span className={labelClass}>Proyecto o actividad</span><select required value={value.unitKey} onChange={(event) => onChange({ ...value, unitKey: event.target.value })} className={inputClass}><option value="">Selecciona Personal o un proyecto</option>{units.map((unit) => <option key={unit.id} value={unit.value}>{unit.label}</option>)}</select></label>
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

function formatAccountBalance(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeAccountType(value?: string) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'wallet' || normalized === 'billetera') return 'Billetera digital';
  if (normalized === 'cash') return 'Efectivo';
  if (normalized === 'bank') return 'Ahorros';
  if (normalized === 'ahorros') return 'Ahorros';
  if (normalized === 'corriente') return 'Corriente';
  if (normalized === 'billetera digital') return 'Billetera digital';
  if (normalized === 'efectivo') return 'Efectivo';
  if (normalized === 'inversión') return 'Inversión';
  return 'Ahorros';
}

function PlanOption({ plan, current, selected, onSelect }: { plan: BillingPlan; current: boolean; selected: boolean; onSelect: () => void }) {
  const price = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(plan.monthlyPriceCop);
  return (
    <button type="button" disabled={plan.code === 'free'} onClick={onSelect} className={`w-full rounded-2xl border p-4 text-left transition-colors ${selected ? 'border-arca-accent bg-arca-accent/[0.08]' : current ? 'border-arca-success/30 bg-arca-success/[0.04]' : 'border-arca-border bg-arca-surface-1'} disabled:cursor-default`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-bold text-arca-text-primary">{plan.name}</p><p className="mt-1 text-[10px] leading-relaxed text-arca-text-dim">{plan.description}</p></div>
        <div className="shrink-0 text-right"><p className="text-sm font-black text-arca-text-primary">{plan.monthlyPriceCop ? price : 'Gratis'}</p><p className="text-[8px] text-arca-text-dim">{plan.monthlyPriceCop ? '/ mes' : 'Siempre'}</p></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">{plan.features.map((feature) => <p key={feature} className="flex gap-1.5 text-[9px] leading-relaxed text-arca-text-secondary"><Check size={11} className="mt-0.5 shrink-0 text-arca-success" /> {feature}</p>)}</div>
      <div className="mt-3 flex items-center justify-between border-t border-arca-border pt-3"><span className="text-[9px] font-semibold text-arca-text-dim">{plan.aiMonthlyLimit ? `${plan.aiMonthlyLimit} acciones de Nova al mes` : 'No incluye Nova'}</span>{current ? <span className="rounded-full bg-arca-success/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-arca-success">Plan actual</span> : selected ? <span className="rounded-full bg-arca-accent px-2 py-1 text-[8px] font-black uppercase tracking-wider text-black">Elegido</span> : null}</div>
    </button>
  );
}
