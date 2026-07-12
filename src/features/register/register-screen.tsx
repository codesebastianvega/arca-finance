import { useState, useEffect, useMemo, useTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createAccount, createBusinessUnit, createCreditCard, createIncomeSource, createMovement, createReceivableLoan, createSavingsGoal, createScheduledObligation } from '@/app/actions';
import { useRouter } from 'next/navigation';
import type { RegisterViewModel } from '@/src/lib/register-data';
import { 
  Check, 
  CheckCircle2,
  ChevronDown, 
  Utensils, 
  Car, 
  Home, 
  Gamepad2, 
  HeartPulse, 
  MoreHorizontal, 
  Zap, 
  AlertCircle, 
  CreditCard, 
  PiggyBank, 
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  Search,
  X
} from 'lucide-react';
import { haptics } from '../../lib/haptics';

const CATEGORIES = [
  { id: 'hogar', label: 'Hogar', icon: Home },
  { id: 'comida', label: 'Comida', icon: Utensils },
  { id: 'transporte', label: 'Transporte', icon: Car },
  { id: 'ocio', label: 'Ocio', icon: Gamepad2 },
  { id: 'salud', label: 'Salud', icon: HeartPulse },
  { id: 'servicios', label: 'Servicios', icon: Zap },
  { id: 'otros', label: 'Otros', icon: MoreHorizontal },
];

function iconForCategory(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes('hogar') || normalized.includes('arriendo')) return Home;
  if (normalized.includes('comida') || normalized.includes('mercado')) return Utensils;
  if (normalized.includes('transporte') || normalized.includes('gasolina')) return Car;
  if (normalized.includes('ocio') || normalized.includes('entreten')) return Gamepad2;
  if (normalized.includes('salud') || normalized.includes('medic')) return HeartPulse;
  if (normalized.includes('servicio') || normalized.includes('luz') || normalized.includes('agua') || normalized.includes('internet')) return Zap;
  return MoreHorizontal;
}

const COLOMBIAN_BANKS = [
  { id: 'nequi', name: 'Nequi', color: '#8235E6', textColor: '#FFFFFF' },
  { id: 'daviplata', name: 'Daviplata', color: '#E51C1A', textColor: '#FFFFFF' },
  { id: 'bancolombia', name: 'Bancolombia', color: '#FDDA24', textColor: '#2A2117' },
  { id: 'davivienda', name: 'Davivienda', color: '#ED1C24', textColor: '#FFFFFF' },
  { id: 'bbva', name: 'BBVA', color: '#004481', textColor: '#FFFFFF' },
  { id: 'nu', name: 'Nu', color: '#820AD1', textColor: '#FFFFFF' },
  { id: 'rappipay', name: 'RappiPay', color: '#111111', textColor: '#FFFFFF' },
  { id: 'falabella', name: 'Falabella', color: '#7CB342', textColor: '#FFFFFF' },
  { id: 'banco-bogota', name: 'Banco de Bogotá', color: '#D71920', textColor: '#FFFFFF' },
  { id: 'banco-caja-social', name: 'Banco Caja Social', color: '#1D4F91', textColor: '#FFFFFF' },
  { id: 'av-villas', name: 'AV Villas', color: '#F58220', textColor: '#2A2117' },
  { id: 'banco-popular', name: 'Banco Popular', color: '#2B5CAB', textColor: '#FFFFFF' },
  { id: 'colpatria', name: 'Scotiabank Colpatria', color: '#E31837', textColor: '#FFFFFF' },
  { id: 'itau', name: 'Itaú', color: '#FF6A13', textColor: '#2A2117' },
  { id: 'pichincha', name: 'Banco Pichincha', color: '#FFCC00', textColor: '#2A2117' },
  { id: 'finandina', name: 'Finandina', color: '#6A1B9A', textColor: '#FFFFFF' },
  { id: 'serfinanza', name: 'Serfinanza', color: '#00A19A', textColor: '#FFFFFF' },
  { id: 'movii', name: 'Movii', color: '#00C853', textColor: '#2A2117' },
  { id: 'lulobank', name: 'Lulo Bank', color: '#5B2EFF', textColor: '#FFFFFF' },
  { id: 'dale', name: 'Dale!', color: '#00AEEF', textColor: '#FFFFFF' },
  { id: 'paypal', name: 'PayPal', color: '#003087', textColor: '#FFFFFF' },
  { id: 'efectivo', name: 'Efectivo', color: '#2E7D32', textColor: '#FFFFFF' },
];

const CREDIT_CARD_ISSUERS = [
  { id: 'bancolombia', name: 'Bancolombia', color: '#FDDA24', textColor: '#2A2117' },
  { id: 'nu', name: 'Nu', color: '#820AD1', textColor: '#FFFFFF' },
  { id: 'davivienda', name: 'Davivienda', color: '#ED1C24', textColor: '#FFFFFF' },
  { id: 'bbva', name: 'BBVA', color: '#004481', textColor: '#FFFFFF' },
  { id: 'banco-bogota', name: 'Banco de Bogotá', color: '#D71920', textColor: '#FFFFFF' },
  { id: 'caja-social', name: 'Banco Caja Social', color: '#1D4F91', textColor: '#FFFFFF' },
  { id: 'av-villas', name: 'AV Villas', color: '#F58220', textColor: '#2A2117' },
  { id: 'banco-popular', name: 'Banco Popular', color: '#2B5CAB', textColor: '#FFFFFF' },
  { id: 'colpatria', name: 'Scotiabank Colpatria', color: '#E31837', textColor: '#FFFFFF' },
  { id: 'falabella', name: 'Falabella', color: '#7CB342', textColor: '#FFFFFF' },
  { id: 'rappicard', name: 'RappiCard', color: '#111111', textColor: '#FFFFFF' },
  { id: 'itau', name: 'Itaú', color: '#FF6A13', textColor: '#2A2117' },
  { id: 'pichincha', name: 'Banco Pichincha', color: '#FFCC00', textColor: '#2A2117' },
  { id: 'finandina', name: 'Finandina', color: '#6A1B9A', textColor: '#FFFFFF' },
  { id: 'serfinanza', name: 'Serfinanza', color: '#00A19A', textColor: '#FFFFFF' },
];

const CARD_INTEREST_TYPES = [
  { id: 'effective_annual', label: 'EA' },
  { id: 'nominal_monthly', label: 'Nominal mensual' },
  { id: 'unknown', label: 'Sin definir' },
];

const CARD_PAYMENT_STRATEGIES = [
  { id: 'minimum', label: 'Pagar mínimo' },
  { id: 'fixed', label: 'Monto fijo' },
  { id: 'avalanche', label: 'Reducir intereses' },
  { id: 'snowball', label: 'Liberar cupo rápido' },
];

const OBLIGATION_TYPES = [
  { id: 'arriendo', label: 'Arriendo' },
  { id: 'servicio', label: 'Servicio' },
  { id: 'credito', label: 'Crédito' },
  { id: 'tarjeta', label: 'Pago de tarjeta' },
  { id: 'suscripcion', label: 'Suscripción' },
  { id: 'mercado', label: 'Mercado' },
  { id: 'educacion', label: 'Educación' },
  { id: 'salud', label: 'Salud' },
  { id: 'otro', label: 'Otro' },
];

const SEGMENTS = ['Movimiento', 'Cuenta', 'Tarjeta', 'Obligacion', 'Ahorro', 'Prestamo'];

const REGISTER_GROUPS = [
  {
    id: 'movimiento' as const,
    label: 'Movimiento',
    helper: 'Registra dinero real que ya entró o salió.',
    segments: [
      { id: 'Movimiento', label: 'Movimiento', helper: 'Ingreso o gasto confirmado.' },
      { id: 'Prestamo', label: 'Préstamo', helper: 'Plata que sale y luego vuelve.' },
    ],
  },
  {
    id: 'planificado' as const,
    label: 'Planificado',
    helper: 'Compromisos que debes seguir o confirmar.',
    segments: [{ id: 'Obligacion', label: 'Obligación', helper: 'Arriendo, servicios o cuotas.' }],
  },
  {
    id: 'estructura' as const,
    label: 'Estructura',
    helper: 'Base del sistema: cuentas, tarjetas y ahorro.',
    segments: [
      { id: 'Cuenta', label: 'Cuenta', helper: 'Banco, billetera o efectivo.' },
      { id: 'Tarjeta', label: 'Tarjeta', helper: 'Crédito y cupo disponible.' },
      { id: 'Ahorro', label: 'Ahorro', helper: 'Metas o bolsillos protegidos.' },
    ],
  },
];

export default function RegisterScreen({ data, onSuccess }: { data: RegisterViewModel; onSuccess?: () => void }) {
  const router = useRouter();
  const [isQuickCreatePending, startQuickCreate] = useTransition();
  const [activeSegment, setActiveSegment] = useState('Movimiento');
  const [activeGroup, setActiveGroup] = useState<'movimiento' | 'planificado' | 'estructura'>('movimiento');
  const [type, setType] = useState<'gasto' | 'ingreso'>('gasto');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [movementAccountId, setMovementAccountId] = useState('');
  const [movementUnit, setMovementUnit] = useState('');
  const [movementDate, setMovementDate] = useState('');
  const [movementIncomeSourceId, setMovementIncomeSourceId] = useState('');
  const [selectedBank, setSelectedBank] = useState(COLOMBIAN_BANKS[0]);
  const [accountName, setAccountName] = useState('');
  const [accountInitialBalance, setAccountInitialBalance] = useState('');
  const [selectedCardIssuer, setSelectedCardIssuer] = useState(CREDIT_CARD_ISSUERS[0]);
  const [accountType, setAccountType] = useState('Ahorros');
  const [interestRate, setInterestRate] = useState('');
  const [installments, setInstallments] = useState('');
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtAccountId, setDebtAccountId] = useState('');
  const [debtType, setDebtType] = useState(OBLIGATION_TYPES[0].id);
  const [debtNotes, setDebtNotes] = useState('');
  const [quickUnitName, setQuickUnitName] = useState('');
  const [quickSourceName, setQuickSourceName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardUsed, setCardUsed] = useState('');
  const [cardPayDay, setCardPayDay] = useState('');
  const [cardMinimumPayment, setCardMinimumPayment] = useState('');
  const [cardAnnualInterestRate, setCardAnnualInterestRate] = useState('');
  const [cardInterestType, setCardInterestType] = useState('effective_annual');
  const [cardEstimatedPayoffMonths, setCardEstimatedPayoffMonths] = useState('');
  const [cardEstimatedTotalPayment, setCardEstimatedTotalPayment] = useState('');
  const [cardPaymentStrategy, setCardPaymentStrategy] = useState('minimum');
  const [cardNotes, setCardNotes] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savingsName, setSavingsName] = useState('');
  const [savingsCurrent, setSavingsCurrent] = useState('');
  const [savingsDueDate, setSavingsDueDate] = useState('');
  const [savingsGoalType, setSavingsGoalType] = useState<'goal' | 'pocket'>('goal');
  const [debtorName, setDebtorName] = useState('');
  const [loanConcept, setLoanConcept] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanAccountId, setLoanAccountId] = useState('');
  const [loanNotes, setLoanNotes] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  const [selectedCategoryValue, setSelectedCategoryValue] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isIssuerPickerOpen, setIsIssuerPickerOpen] = useState(false);
  const [issuerQuery, setIssuerQuery] = useState('');
  const [isBankPickerOpen, setIsBankPickerOpen] = useState(false);
  const [bankQuery, setBankQuery] = useState('');

  const filteredIssuers = useMemo(() => {
    const query = issuerQuery.trim().toLowerCase();
    if (!query) return CREDIT_CARD_ISSUERS;
    return CREDIT_CARD_ISSUERS.filter((issuer) => issuer.name.toLowerCase().includes(query));
  }, [issuerQuery]);

  const filteredBanks = useMemo(() => {
    const query = bankQuery.trim().toLowerCase();
    if (!query) return COLOMBIAN_BANKS;
    return COLOMBIAN_BANKS.filter((bank) => bank.name.toLowerCase().includes(query));
  }, [bankQuery]);

  const expenseCategoryOptions = useMemo(() => {
    if (data.categories.length > 0) {
      return data.categories.map((category) => ({
        id: category.id,
        label: category.label,
        value: category.value,
        icon: iconForCategory(category.label),
      }));
    }

    return CATEGORIES.map((category) => ({
      id: category.id,
      label: category.label,
      value: category.label,
      icon: category.icon,
    }));
  }, [data.categories]);

  const currentGroup =
    REGISTER_GROUPS.find((group) => group.id === activeGroup) ?? REGISTER_GROUPS[0];
  const currentSegment =
    REGISTER_GROUPS.flatMap((group) => group.segments).find((segment) => segment.id === activeSegment) ??
    REGISTER_GROUPS[0].segments[0];
  const activeSegmentLabel =
    currentSegment.label === 'Cuenta'
      ? 'cuenta'
      : currentSegment.label === 'Tarjeta'
        ? 'tarjeta'
        : currentSegment.label === 'Ahorro'
          ? 'ahorro'
          : currentSegment.label === 'Préstamo'
            ? 'préstamo'
            : currentSegment.label === 'Obligación'
              ? 'obligación'
              : 'movimiento';
  const debtHasFinancingTerms = debtType === 'credito' || debtType === 'tarjeta';

  useEffect(() => {
    if (!movementAccountId) {
      setMovementAccountId(data.accounts[0]?.value ?? '');
    }
    if (!movementUnit) {
      setMovementUnit(data.units[0]?.value ?? 'general');
    }
    if (!movementDate) {
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      setMovementDate(today);
    }
    if (!movementIncomeSourceId) {
      setMovementIncomeSourceId(data.incomeSources[0]?.id ?? '');
    }
    if (!loanAccountId) {
      setLoanAccountId(data.accounts[0]?.value ?? '');
    }
    if (!selectedCategoryValue) {
      setSelectedCategoryValue(expenseCategoryOptions[0]?.value ?? 'General');
    }
  }, [data.accounts, data.units, data.incomeSources, movementAccountId, movementUnit, movementDate, movementIncomeSourceId, loanAccountId, selectedCategoryValue, expenseCategoryOptions]);

  useEffect(() => {
    if (type !== 'ingreso') return;
    const source = data.incomeSources.find((item) => item.id === movementIncomeSourceId);
    if (!source) return;
    if (source.unitKey) setMovementUnit(source.unitKey);
    if (source.defaultAccountId) setMovementAccountId(source.defaultAccountId);
  }, [type, movementIncomeSourceId, data.incomeSources]);

  useEffect(() => {
    const ownerGroup = REGISTER_GROUPS.find((group) =>
      group.segments.some((segment) => segment.id === activeSegment),
    );
    if (ownerGroup && ownerGroup.id !== activeGroup) {
      setActiveGroup(ownerGroup.id);
    }
  }, [activeSegment, activeGroup]);

  const resetCardForm = () => {
    setCardName('');
    setLimit('');
    setCardUsed('');
    setClosingDate('');
    setCardPayDay('');
    setCardMinimumPayment('');
    setCardAnnualInterestRate('');
    setCardInterestType('effective_annual');
    setCardEstimatedPayoffMonths('');
    setCardEstimatedTotalPayment('');
    setCardPaymentStrategy('minimum');
    setCardNotes('');
  };

  const resetAccountForm = () => {
    setAccountName('');
    setAccountInitialBalance('');
    setAccountType('Ahorros');
    setSelectedBank(COLOMBIAN_BANKS[0]);
  };

  const resetSavingsForm = () => {
    setSavingsName('');
    setTargetAmount('');
    setSavingsCurrent('');
    setSavingsDueDate('');
    setSavingsGoalType('goal');
  };

  const resetMovementForm = () => {
    setAmount('');
    setDescription('');
    setTags('');
    setSelectedCategoryValue(expenseCategoryOptions[0]?.value ?? 'General');
    setMovementAccountId(data.accounts[0]?.value ?? '');
    setMovementUnit(data.units[0]?.value ?? 'general');
    setMovementIncomeSourceId(data.incomeSources[0]?.id ?? '');
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    setMovementDate(today);
  };

  const resetDebtForm = () => {
    setDebtName('');
    setDebtAmount('');
    setInterestRate('');
    setInstallments('');
    setDueDate('');
    setDebtType(OBLIGATION_TYPES[0].id);
    setDebtNotes('');
    setDebtAccountId('');
  };

  const resetLoanForm = () => {
    setDebtorName('');
    setLoanConcept('');
    setLoanAmount('');
    setReturnDate('');
    setLoanAccountId(data.accounts[0]?.value ?? '');
    setLoanNotes('');
  };

  const handleQuickCreateUnit = () => {
    if (!quickUnitName.trim()) {
      setSubmitError('Escribe el nombre del frente primero.');
      return;
    }

    setSubmitError(null);
    startQuickCreate(async () => {
      try {
        await createBusinessUnit({
          name: quickUnitName,
          key: quickUnitName,
        });
        setQuickUnitName('');
        haptics.success();
        router.refresh();
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'No se pudo crear el frente.');
        haptics.error();
      }
    });
  };

  const handleQuickCreateSource = () => {
    if (!quickSourceName.trim()) {
      setSubmitError('Escribe el nombre de la fuente primero.');
      return;
    }

    if (!movementUnit) {
      setSubmitError('Primero crea o elige un frente.');
      return;
    }

    if (!movementAccountId) {
      setSubmitError('Primero elige la cuenta destino.');
      return;
    }

    setSubmitError(null);
    startQuickCreate(async () => {
      try {
        await createIncomeSource({
          name: quickSourceName,
          businessUnitKey: movementUnit,
          defaultAccountId: movementAccountId,
        });
        setQuickSourceName('');
        haptics.success();
        router.refresh();
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'No se pudo crear la fuente.');
        haptics.error();
      }
    });
  };

  const handleSubmit = async () => {
    haptics.light();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (activeSegment === 'Movimiento') {
        await createMovement({
          kind: type === 'ingreso' ? 'income' : 'expense',
          amount: Number(amount || '0'),
          concept: description,
          accountId: movementAccountId,
          category: type === 'ingreso' ? 'ingreso' : selectedCategoryValue,
          unit: movementUnit,
          date: movementDate,
          sourceId: type === 'ingreso' ? movementIncomeSourceId : null,
          sourceLabel: type === 'ingreso' ? data.incomeSources.find((item) => item.id === movementIncomeSourceId)?.label ?? null : null,
        });
        resetMovementForm();
      } else if (activeSegment === 'Cuenta') {
        await createAccount({
          name: accountName,
          entity: selectedBank.name,
          type: accountType,
          balance: Number(accountInitialBalance || '0'),
          color: selectedBank.color,
        });
        resetAccountForm();
      } else if (activeSegment === 'Tarjeta') {
        await createCreditCard({
          name: cardName,
          issuer: selectedCardIssuer.name,
          limitValue: Number(limit || '0'),
          used: Number(cardUsed || '0'),
          cutOffDate: Number(closingDate || '1'),
          payDueDate: Number(cardPayDay || '1'),
          minimumPayment: Number(cardMinimumPayment || '0'),
          annualInterestRate: cardAnnualInterestRate ? Number(cardAnnualInterestRate) : null,
          interestType: cardInterestType,
          estimatedPayoffMonths: cardEstimatedPayoffMonths ? Number(cardEstimatedPayoffMonths) : null,
          estimatedTotalPayment: cardEstimatedTotalPayment ? Number(cardEstimatedTotalPayment) : null,
          paymentStrategy: cardPaymentStrategy,
          notes: cardNotes,
        });
        resetCardForm();
      } else if (activeSegment === 'Ahorro') {
        await createSavingsGoal({
          name: savingsName,
          target: Number(targetAmount || '0'),
          current: Number(savingsCurrent || '0'),
          dueDate: savingsDueDate || null,
          goalType: savingsGoalType,
          color: savingsGoalType === 'pocket' ? '#8FA66A' : '#16735b',
        });
        resetSavingsForm();
      } else if (activeSegment === 'Obligacion') {
        await createScheduledObligation({
          title: debtName,
          amount: Number(debtAmount || '0'),
          dueDate,
          accountId: debtAccountId || null,
          obligationType: debtType,
          notes: debtNotes || null,
          interestRate: interestRate ? Number(interestRate) : null,
          installments: installments ? Number(installments) : null,
        });
        resetDebtForm();
      } else if (activeSegment === 'Prestamo') {
        await createReceivableLoan({
          debtorName,
          title: loanConcept,
          amount: Number(loanAmount || '0'),
          dueDate: returnDate || null,
          accountId: loanAccountId,
          notes: loanNotes || null,
        });
        resetLoanForm();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      setIsSuccess(true);
      haptics.success();
      router.refresh();
      if (onSuccess) {
        setTimeout(() => onSuccess(), 700);
      }
      setTimeout(() => setIsSuccess(false), 2000);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo guardar.');
      haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMovementForm = () => (
    <div className="space-y-6">
      <div className="flex bg-arca-surface-2 light:bg-arca-light-surface-2 p-1 rounded-2xl border border-arca-border light:border-arca-light-border">
        <button 
          onClick={() => { haptics.light(); setType('gasto'); }}
          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${type === 'gasto' ? 'bg-arca-alert text-white shadow-lg shadow-arca-alert/20' : 'text-arca-text-dim'}`}
        >
          <ArrowDownLeft size={14} />
          <span>Gasto</span>
        </button>
        <button 
          onClick={() => { haptics.light(); setType('ingreso'); }}
          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${type === 'ingreso' ? 'bg-arca-positive text-white shadow-lg shadow-arca-positive/20' : 'text-arca-text-dim'}`}
        >
          <ArrowUpRight size={14} />
          <span>Ingreso</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1 text-center block">Monto</label>
          <div className="relative flex justify-center">
            <span className="absolute left-1/4 top-1/2 -translate-y-1/2 text-2xl font-black text-arca-text-dim/30">$</span>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
              placeholder="0" 
              className="w-full bg-transparent text-5xl font-black text-center focus:outline-none placeholder:text-arca-text-dim/10 py-4"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Concepto</label>
            <span className="text-[8px] font-bold uppercase tracking-widest text-arca-text-dim">Manual</span>
          </div>
          <input 
            type="text" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'ingreso' ? 'Ej: Pago quincena, venta, contrato...' : '¿En qué se fue el dinero?'} 
            className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:outline-none focus:border-arca-accent transition-all"
          />
        </div>

        {type === 'gasto' ? (
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Categoria</label>
            <div className="grid grid-cols-4 gap-2">
              {expenseCategoryOptions.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategoryValue(cat.value); haptics.light(); }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedCategoryValue === cat.value ? 'bg-arca-accent/10 border-arca-accent text-arca-accent shadow-md' : 'bg-arca-surface-2 light:bg-arca-light-surface-2 border-arca-border light:border-arca-light-border text-arca-text-dim'}`}
                >
                  <cat.icon size={18} strokeWidth={selectedCategoryValue === cat.value ? 2.5 : 2} />
                  <span className="text-[8px] font-bold mt-2 uppercase tracking-tighter">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Fuente de ingreso</label>
            <select
              value={movementIncomeSourceId}
              onChange={(e) => setMovementIncomeSourceId(e.target.value)}
              disabled={data.incomeSources.length === 0}
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none appearance-none"
            >
              {data.incomeSources.length > 0 ? (
                data.incomeSources.map((source) => (
                  <option key={source.id} value={source.id}>{source.label}</option>
                ))
              ) : (
                <option value="">Primero crea una fuente en Negocios</option>
              )}
            </select>
            {data.incomeSources.length === 0 ? (
              <p className="text-[10px] text-arca-alert">Primero crea un frente y una fuente de ingreso en Negocios.</p>
            ) : null}
          </div>
        )}

        {type === 'ingreso' && data.units.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-arca-border bg-arca-surface-2 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Crear frente rapido</p>
              <p className="text-[11px] text-arca-text-dim">Necesitas al menos un frente para ordenar de donde llega ese ingreso.</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickUnitName}
                onChange={(e) => setQuickUnitName(e.target.value)}
                placeholder="Ej: Trabajo fijo, Freelance..."
                className="min-w-0 flex-1 bg-arca-surface-3 border border-arca-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-arca-accent"
              />
              <button
                type="button"
                onClick={handleQuickCreateUnit}
                disabled={isQuickCreatePending}
                className="rounded-xl bg-arca-accent px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
              >
                Crear
              </button>
            </div>
          </div>
        ) : null}

        {type === 'ingreso' && data.units.length > 0 && data.incomeSources.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-arca-border bg-arca-surface-2 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Crear fuente rapida</p>
              <p className="text-[11px] text-arca-text-dim">Liga este ingreso a un frente y a una cuenta destino por defecto.</p>
            </div>
            <input
              type="text"
              value={quickSourceName}
              onChange={(e) => setQuickSourceName(e.target.value)}
              placeholder="Ej: Nomina, contrato OPS, clientes..."
              className="w-full bg-arca-surface-3 border border-arca-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-arca-accent"
            />
            <button
              type="button"
              onClick={handleQuickCreateSource}
              disabled={isQuickCreatePending || !movementAccountId || !movementUnit}
              className="w-full rounded-xl bg-arca-accent px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              Crear fuente
            </button>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Cuenta</label>
          <select
            value={movementAccountId}
            onChange={(e) => setMovementAccountId(e.target.value)}
            className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none appearance-none"
          >
            {data.accounts.map((account) => (
              <option key={account.id} value={account.value}>{account.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Frente</label>
            <select
              value={movementUnit}
              onChange={(e) => setMovementUnit(e.target.value)}
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none appearance-none"
            >
              {data.units.map((unit) => (
                <option key={unit.id} value={unit.value}>{unit.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Fecha</label>
            <input
              type="date"
              value={movementDate}
              onChange={(e) => setMovementDate(e.target.value)}
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
            />
          </div>
        </div>

        {activeSegment === 'Movimiento' && submitError ? (
          <div className="text-xs text-arca-alert">{submitError}</div>
        ) : null}
      </div>
    </div>
  );

  const renderAccountForm = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Nombre de la cuenta</label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Ej: Daviplata nomina, Caja diaria, Fondo viaje..."
            className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
          />
          <p className="text-[10px] text-arca-text-dim">Este nombre es libre. La entidad se elige aparte.</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Entidad o marca</label>
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setBankQuery('');
              setIsBankPickerOpen(true);
            }}
            className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-2xl px-4 py-4 text-left flex items-center justify-between"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                style={{ backgroundColor: selectedBank.color, color: selectedBank.textColor }}
              >
                {selectedBank.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-arca-text-primary truncate">{selectedBank.name}</p>
                <p className="text-[10px] font-medium text-arca-text-dim uppercase tracking-widest">Selecciona banco o billetera</p>
              </div>
            </div>
            <ChevronDown size={18} className="text-arca-text-dim shrink-0" />
          </button>
        </div>

        <div
          className="rounded-3xl p-5 border border-arca-border shadow-sm"
          style={{ backgroundColor: selectedBank.color, color: selectedBank.textColor }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-80">{selectedBank.name}</p>
              <p className="text-base font-bold mt-2">{accountName || 'Tu cuenta principal'}</p>
            </div>
            <Wallet size={22} className="opacity-80" />
          </div>
          <div className="mt-8 flex items-end justify-between">
            <div>
              <p className="text-[9px] uppercase opacity-70">Saldo inicial</p>
              <p className="text-lg font-black">{accountInitialBalance ? `$ ${Number(accountInitialBalance).toLocaleString('es-CO')}` : '$ 0'}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase opacity-70">Tipo</p>
              <p className="text-sm font-bold">{accountType}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Saldo inicial</label>
          <div className="relative">
            <input
              type="number"
              value={accountInitialBalance}
              onChange={(e) => setAccountInitialBalance(e.target.value)}
              placeholder="0" 
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl pl-10 pr-4 py-4 text-xl font-bold focus:border-arca-accent outline-none"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-arca-text-dim font-bold">$</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Tipo de cuenta</label>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none appearance-none"
          >
            <option>Ahorros</option>
            <option>Corriente</option>
            <option>Wallet</option>
            <option>Efectivo</option>
            <option>Bolsillo</option>
          </select>
        </div>

        {activeSegment === 'Cuenta' && submitError ? (
          <div className="text-xs text-arca-alert">{submitError}</div>
        ) : null}
      </div>
    </div>
  );

  const renderDebtForm = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2 text-center py-6 bg-arca-alert/5 rounded-3xl border border-arca-alert/10">
          <AlertCircle size={32} className="mx-auto text-arca-alert mb-2" />
          <h4 className="text-xs font-bold uppercase text-arca-alert tracking-widest">Nueva deuda u obligación</h4>
          <p className="text-[10px] text-arca-text-dim">Define qué es, cuánto pesa y desde qué cuenta debería salir.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Tipo</label>
            <select
              value={debtType}
              onChange={(e) => setDebtType(e.target.value)}
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none appearance-none"
            >
              {OBLIGATION_TYPES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Cuenta sugerida</label>
            <select
              value={debtAccountId}
              onChange={(e) => setDebtAccountId(e.target.value)}
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none appearance-none"
            >
              <option value="">Sin cuenta fija</option>
              {data.accounts.length > 0 ? (
                data.accounts.map((account) => (
                  <option key={account.id} value={account.value}>{account.label}</option>
                ))
              ) : (
                <option value="">Primero crea una cuenta</option>
              )}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Nombre / entidad</label>
          <input 
            type="text" 
            value={debtName}
            onChange={(e) => setDebtName(e.target.value)}
            placeholder="Ej: Arriendo apto, Crédito libre inversión..." 
            className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Monto esperado</label>
          <div className="relative">
            <input 
              type="number" 
              value={debtAmount}
              onChange={(e) => setDebtAmount(e.target.value)}
              placeholder="0" 
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl pl-10 pr-4 py-4 text-xl font-bold focus:border-arca-accent outline-none"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-arca-text-dim font-bold">$</span>
          </div>
        </div>

        {debtHasFinancingTerms ? (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">
              Detalles de financiación
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Interés EA (%)</label>
                <input 
                  type="number" 
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="0.0" 
                  className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Cuotas totales</label>
                <input 
                  type="number" 
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  placeholder="12" 
                  className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Próxima fecha de pago</label>
          <input 
            type="date" 
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Notas (opcional)</label>
          <textarea
            value={debtNotes}
            onChange={(e) => setDebtNotes(e.target.value)}
            rows={3}
            placeholder="Ej: contrato por 12 meses, pago fijo, vence cada 5..."
            className="w-full resize-none bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
          />
        </div>

        {activeSegment === 'Obligacion' && submitError ? (
          <div className="text-xs text-arca-alert">{submitError}</div>
        ) : null}
      </div>
    </div>
  );

  const renderCardForm = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Entidad Emisora</label>
        <button
          type="button"
          onClick={() => {
            haptics.light();
            setIssuerQuery('');
            setIsIssuerPickerOpen(true);
          }}
          className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-2xl px-4 py-4 text-left flex items-center justify-between"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
              style={{ backgroundColor: selectedCardIssuer.color, color: selectedCardIssuer.textColor }}
            >
              {selectedCardIssuer.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-arca-text-primary truncate">{selectedCardIssuer.name}</p>
              <p className="text-[10px] font-medium text-arca-text-dim uppercase tracking-widest">Selecciona el emisor real</p>
            </div>
          </div>
          <ChevronDown size={18} className="text-arca-text-dim shrink-0" />
        </button>

        <div
          className="rounded-3xl p-5 border border-arca-border shadow-sm"
          style={{ backgroundColor: selectedCardIssuer.color, color: selectedCardIssuer.textColor }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-80">{selectedCardIssuer.name}</p>
              <p className="text-base font-bold mt-2">{cardName || 'Tu tarjeta principal'}</p>
            </div>
            <CreditCard size={22} className="opacity-80" />
          </div>
          <div className="mt-8 flex items-end justify-between">
            <div>
              <p className="text-[9px] uppercase opacity-70">Cupo</p>
              <p className="text-lg font-black">{limit ? `$ ${Number(limit).toLocaleString('es-CO')}` : '$ 0'}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase opacity-70">Usado</p>
              <p className="text-sm font-bold">{cardUsed ? `$ ${Number(cardUsed).toLocaleString('es-CO')}` : '$ 0'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Nombre de la Tarjeta (Alias)</label>
          <input 
            type="text" 
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            placeholder="Ej: Mi Black, Rappi Card..." 
            className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Cupo Total</label>
            <input 
              type="number" 
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="0" 
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-bold focus:border-arca-accent outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Deuda Actual</label>
            <input 
              type="number" 
              value={cardUsed}
              onChange={(e) => setCardUsed(e.target.value)}
              placeholder="0" 
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-bold focus:border-arca-accent outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Día de Corte</label>
            <input 
              type="number" 
              max="31"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              placeholder="15" 
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Día de Pago</label>
            <input 
              type="number" 
              max="31"
              value={cardPayDay}
              onChange={(e) => setCardPayDay(e.target.value)}
              placeholder="30" 
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
            />
          </div>

        </div>


        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Pago mínimo</label>
            <input
              type="number"
              value={cardMinimumPayment}
              onChange={(e) => setCardMinimumPayment(e.target.value)}
              placeholder="0"
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Tasa anual (%)</label>
            <input
              type="number"
              value={cardAnnualInterestRate}
              onChange={(e) => setCardAnnualInterestRate(e.target.value)}
              placeholder="0.0"
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Tipo de interés</label>
            <select
              value={cardInterestType}
              onChange={(e) => setCardInterestType(e.target.value)}
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none appearance-none"
            >
              {CARD_INTEREST_TYPES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Estrategia</label>
            <select
              value={cardPaymentStrategy}
              onChange={(e) => setCardPaymentStrategy(e.target.value)}
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none appearance-none"
            >
              {CARD_PAYMENT_STRATEGIES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Meses estimados</label>
            <input
              type="number"
              value={cardEstimatedPayoffMonths}
              onChange={(e) => setCardEstimatedPayoffMonths(e.target.value)}
              placeholder="0"
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Total estimado</label>
            <input
              type="number"
              value={cardEstimatedTotalPayment}
              onChange={(e) => setCardEstimatedTotalPayment(e.target.value)}
              placeholder="0"
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Notas (opcional)</label>
          <textarea
            rows={3}
            value={cardNotes}
            onChange={(e) => setCardNotes(e.target.value)}
            placeholder="Ej: cuota fija, revisar pago total, usar solo para mercado..."
            className="w-full resize-none bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
          />
        </div>
        {activeSegment === 'Tarjeta' && submitError ? (
          <div className="text-xs text-arca-alert">{submitError}</div>
        ) : null}
      </div>
    </div>
  );

  const renderSavingsForm = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="p-6 bg-arca-accent/5 rounded-3xl border border-arca-accent/10 flex flex-col items-center text-center space-y-2">
          <PiggyBank size={40} className="text-arca-accent" />
          <h4 className="text-xs font-bold uppercase text-arca-accent tracking-widest">
            {savingsGoalType === 'pocket' ? 'Nuevo bolsillo' : 'Nueva meta de ahorro'}
          </h4>
          <p className="text-[9px] text-arca-text-dim uppercase tracking-wider">
            {savingsGoalType === 'pocket' ? 'Separa plata protegida' : 'Define tu próximo gran objetivo'}
          </p>
        </div>

        <div className="flex bg-arca-surface-2 light:bg-arca-light-surface-2 p-1 rounded-2xl border border-arca-border light:border-arca-light-border">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setSavingsGoalType('goal');
            }}
            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${savingsGoalType === 'goal' ? 'bg-arca-accent text-white shadow-lg shadow-arca-accent/20' : 'text-arca-text-dim'}`}
          >
            Meta
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setSavingsGoalType('pocket');
            }}
            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${savingsGoalType === 'pocket' ? 'bg-arca-positive text-white shadow-lg shadow-arca-positive/20' : 'text-arca-text-dim'}`}
          >
            Bolsillo
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">
            {savingsGoalType === 'pocket' ? 'Nombre del bolsillo' : 'Qué estás ahorrando'}
          </label>
          <input
            type="text"
            value={savingsName}
            onChange={(e) => setSavingsName(e.target.value)}
            placeholder={savingsGoalType === 'pocket' ? 'Ej: Colchón, Arriendo, Imprevistos...' : 'Ej: Viaje, Fondo de emergencia...'}
            className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">
              {savingsGoalType === 'pocket' ? 'Monto protegido' : 'Meta final'}
            </label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-bold focus:border-arca-accent outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Saldo inicial</label>
            <input
              type="number"
              value={savingsCurrent}
              onChange={(e) => setSavingsCurrent(e.target.value)}
              placeholder="0"
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-bold focus:border-arca-accent outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Fecha objetivo (opcional)</label>
          <input
            type="date"
            value={savingsDueDate}
            onChange={(e) => setSavingsDueDate(e.target.value)}
            className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
          />
        </div>

        {activeSegment === 'Ahorro' && submitError ? (
          <div className="text-xs text-arca-alert">{submitError}</div>
        ) : null}
      </div>
    </div>
  );

  const renderLoanForm = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="p-6 bg-arca-positive/5 rounded-3xl border border-arca-positive/10 flex flex-col items-center text-center space-y-2">
          <HandCoins size={40} className="text-arca-positive" />
          <h4 className="text-xs font-bold uppercase text-arca-positive tracking-widest">{"Registrar pr\u00e9stamo"}</h4>
          <p className="text-[9px] text-arca-text-dim uppercase tracking-wider">Dinero que sale hoy y luego regresa.</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">{"A qui\u00e9n le prestaste"}</label>
          <input
            type="text"
            value={debtorName}
            onChange={(e) => setDebtorName(e.target.value)}
            placeholder="Ej: Cliente, amigo o familiar"
            className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Concepto</label>
          <input
            type="text"
            value={loanConcept}
            onChange={(e) => setLoanConcept(e.target.value)}
            placeholder="Ej: Favor personal, anticipo, préstamo corto..."
            className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Monto prestado</label>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-bold focus:border-arca-accent outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">{"Fecha de devoluci\u00f3n"}</label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Sale de esta cuenta</label>
            {loanAccountId ? (
              <span className="text-[10px] font-semibold text-arca-text-dim">
                Disponible:{" "}
                <span className="text-arca-text-primary">
                  $ {Number(data.accounts.find((account) => account.value === loanAccountId)?.amount ?? 0).toLocaleString("es-CO")}
                </span>
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-3">
            {data.accounts.length > 0 ? data.accounts.map((account) => {
              const selected = loanAccountId === account.value;

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    haptics.light();
                    setLoanAccountId(account.value);
                  }}
                  className={`p-4 rounded-2xl border flex items-center space-x-3 text-left transition-all ${
                    selected
                      ? 'bg-arca-accent/10 border-arca-accent/30'
                      : 'bg-arca-surface-2 border-arca-border'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selected ? 'bg-arca-accent/20 text-arca-accent' : 'bg-arca-surface-3 text-arca-text-dim'}`}>
                    <Wallet size={16} />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold text-arca-text-primary uppercase truncate">{account.label}</p>
                      <p className="text-[10px] font-black text-arca-text-primary whitespace-nowrap">
                        $ {Number(account.amount ?? 0).toLocaleString('es-CO')}
                      </p>
                    </div>
                    <p className="text-[8px] text-arca-text-dim uppercase truncate">
                      {(account.meta ?? 'cuenta').toUpperCase()} · Sale de esta cuenta
                    </p>
                  </div>
                </button>
              );
            }) : (
              <div className="p-4 rounded-2xl border border-arca-border bg-arca-surface-2 text-[11px] text-arca-alert">
                {"Primero crea una cuenta para registrar un pr\u00e9stamo."}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Notas (opcional)</label>
          <textarea
            rows={3}
            value={loanNotes}
            onChange={(e) => setLoanNotes(e.target.value)}
            placeholder="Ej: Me lo devuelve el viernes, quedó pendiente parte en efectivo..."
            className="w-full resize-none bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border rounded-xl px-4 py-4 text-sm font-medium focus:border-arca-accent outline-none"
          />
        </div>

        {activeSegment === 'Prestamo' && submitError ? (
          <div className="text-xs text-arca-alert">{submitError}</div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {REGISTER_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              disabled={isSubmitting || isSuccess}
              onClick={() => {
                haptics.light();
                setActiveGroup(group.id);
                setActiveSegment(group.segments[0].id);
              }}
              className={`rounded-2xl px-3 py-3 text-center border transition-all ${
                activeGroup === group.id
                  ? 'bg-arca-accent/12 border-arca-accent text-arca-accent'
                  : 'bg-arca-surface-2 light:bg-arca-light-surface-2 border-arca-border light:border-arca-light-border text-arca-text-dim'
              } ${isSubmitting || isSuccess ? 'opacity-50' : ''}`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]">{group.label}</p>
            </button>
          ))}
        </div>

        <div className="flex overflow-x-auto no-scrollbar gap-2 -mx-1 px-1">
          {currentGroup.segments.map((seg) => (
            <button
              key={seg.id}
              type="button"
              disabled={isSubmitting || isSuccess}
              onClick={() => {
                haptics.light();
                setActiveSegment(seg.id);
              }}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-[11px] font-bold transition-all border ${
                activeSegment === seg.id
                  ? 'bg-arca-accent light:bg-arca-light-accent text-white border-transparent'
                  : 'bg-arca-surface-2 light:bg-arca-light-surface-2 text-arca-text-dim border-arca-border light:border-arca-light-border'
              } ${isSubmitting || isSuccess ? 'opacity-50' : ''}`}
            >
              {seg.label}
            </button>
          ))}
        </div>

        <div className="px-1">
          <p className="text-[11px] text-arca-text-dim">
            <span className="font-semibold text-arca-text-primary">{currentGroup.label}:</span>{' '}
            {currentSegment.helper}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSegment}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeSegment === 'Movimiento' && renderMovementForm()}
          {activeSegment === 'Cuenta' && renderAccountForm()}
          {activeSegment === 'Obligacion' && renderDebtForm()}
          {activeSegment === 'Tarjeta' && renderCardForm()}
          {activeSegment === 'Ahorro' && renderSavingsForm()}
          {activeSegment === 'Prestamo' && renderLoanForm()}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {isBankPickerOpen ? (
          <div className="fixed inset-0 z-[650] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBankPickerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-lg bg-arca-surface-1 rounded-t-[32px] p-6 pb-10 space-y-4"
            >
              <div className="w-12 h-1.5 bg-arca-border rounded-full mx-auto" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-arca-text-primary">Elegir entidad</h3>
                  <p className="text-xs text-arca-text-dim">Bancos y billeteras mas usadas en Colombia.</p>
                </div>
                <button type="button" onClick={() => setIsBankPickerOpen(false)} className="w-9 h-9 rounded-xl border border-arca-border flex items-center justify-center text-arca-text-dim">
                  <X size={16} />
                </button>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-arca-text-dim" />
                <input
                  value={bankQuery}
                  onChange={(e) => setBankQuery(e.target.value)}
                  placeholder="Buscar entidad..."
                  className="w-full h-12 pl-10 pr-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm text-arca-text-primary placeholder:text-arca-text-dim focus:outline-none focus:border-arca-accent"
                />
              </div>

              <div className="max-h-[52vh] overflow-y-auto rounded-2xl border border-arca-border divide-y divide-arca-border">
                {filteredBanks.map((bank) => (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => {
                      haptics.success();
                      setSelectedBank(bank);
                      setIsBankPickerOpen(false);
                    }}
                    className="w-full px-4 py-3 flex items-center justify-between text-left bg-arca-surface-1 hover:bg-arca-surface-2 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                        style={{ backgroundColor: bank.color, color: bank.textColor }}
                      >
                        {bank.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-arca-text-primary truncate">{bank.name}</p>
                        <p className="text-[10px] text-arca-text-dim uppercase tracking-widest">Cuenta o billetera</p>
                      </div>
                    </div>
                    {selectedBank.id === bank.id ? <CheckCircle2 size={18} className="text-arca-accent shrink-0" /> : null}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isIssuerPickerOpen ? (
          <div className="fixed inset-0 z-[650] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsIssuerPickerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-lg bg-arca-surface-1 rounded-t-[32px] p-6 pb-10 space-y-4"
            >
              <div className="w-12 h-1.5 bg-arca-border rounded-full mx-auto" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-arca-text-primary">Elegir emisor</h3>
                  <p className="text-xs text-arca-text-dim">Tarjetas de credito mas usadas en Colombia.</p>
                </div>
                <button type="button" onClick={() => setIsIssuerPickerOpen(false)} className="w-9 h-9 rounded-xl border border-arca-border flex items-center justify-center text-arca-text-dim">
                  <X size={16} />
                </button>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-arca-text-dim" />
                <input
                  value={issuerQuery}
                  onChange={(e) => setIssuerQuery(e.target.value)}
                  placeholder="Buscar entidad..."
                  className="w-full h-12 pl-10 pr-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm text-arca-text-primary placeholder:text-arca-text-dim focus:outline-none focus:border-arca-accent"
                />
              </div>

              <div className="max-h-[52vh] overflow-y-auto rounded-2xl border border-arca-border divide-y divide-arca-border">
                {filteredIssuers.map((issuer) => (
                  <button
                    key={issuer.id}
                    type="button"
                    onClick={() => {
                      haptics.success();
                      setSelectedCardIssuer(issuer);
                      setIsIssuerPickerOpen(false);
                    }}
                    className="w-full px-4 py-3 flex items-center justify-between text-left bg-arca-surface-1 hover:bg-arca-surface-2 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                        style={{ backgroundColor: issuer.color, color: issuer.textColor }}
                      >
                        {issuer.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-arca-text-primary truncate">{issuer.name}</p>
                        <p className="text-[10px] text-arca-text-dim uppercase tracking-widest">Emisor de credito</p>
                      </div>
                    </div>
                    {selectedCardIssuer.id === issuer.id ? <CheckCircle2 size={18} className="text-arca-accent shrink-0" /> : null}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="relative h-14 mt-8">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.button
              key="submit-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                void handleSubmit();
              }}
              disabled={isSubmitting}
              className="w-full h-full rounded-2xl bg-arca-accent text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-arca-accent/20 flex items-center justify-center"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                `Guardar ${activeSegmentLabel}`
              )}
            </motion.button>
          ) : (
            <motion.div
              key="success-indicator"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full h-full rounded-2xl bg-arca-positive text-white flex items-center justify-center space-x-2 shadow-lg shadow-arca-positive/20"
            >
              <Check size={20} strokeWidth={3} />
              <span className="font-bold text-xs uppercase tracking-widest">{"\u00a1Guardado con \u00e9xito!"}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

