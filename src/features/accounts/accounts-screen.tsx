import { useEffect, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  PiggyBank,
  CreditCard as CardIcon,
  Trophy,
  Edit2,
  Trash2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import confetti from "canvas-confetti";
import {
  archiveAccount,
  archiveCreditCard,
  archiveSavingsGoal,
  releasePocket,
  createSavingsContribution,
  updateAccount,
  updateCreditCardFull,
  updateSavingsGoal,
  deleteAccount,
} from "@/app/actions";
import type { MoneyAccount, MoneyCard, MoneySaving, MoneyViewModel } from "@/src/lib/money-data";
import { haptics } from "../../lib/haptics";
import { CalculationHelper } from "@/src/components/calculation-helper";

const ACCOUNT_ENTITIES = [
  { id: "nequi", name: "Nequi", color: "#8235E6", textColor: "#FFFFFF" },
  { id: "daviplata", name: "Daviplata", color: "#E51C1A", textColor: "#FFFFFF" },
  { id: "bancolombia", name: "Bancolombia", color: "#FDDA24", textColor: "#2A2117" },
  { id: "davivienda", name: "Davivienda", color: "#ED1C24", textColor: "#FFFFFF" },
  { id: "bbva", name: "BBVA", color: "#004481", textColor: "#FFFFFF" },
  { id: "nu", name: "Nu", color: "#820AD1", textColor: "#FFFFFF" },
  { id: "rappipay", name: "RappiPay", color: "#111111", textColor: "#FFFFFF" },
  { id: "falabella", name: "Falabella", color: "#7CB342", textColor: "#FFFFFF" },
  { id: "banco-bogota", name: "Banco de Bogota", color: "#D71920", textColor: "#FFFFFF" },
  { id: "banco-caja-social", name: "Banco Caja Social", color: "#1D4F91", textColor: "#FFFFFF" },
  { id: "av-villas", name: "AV Villas", color: "#F58220", textColor: "#2A2117" },
  { id: "banco-popular", name: "Banco Popular", color: "#2B5CAB", textColor: "#FFFFFF" },
  { id: "colpatria", name: "Scotiabank Colpatria", color: "#E31837", textColor: "#FFFFFF" },
  { id: "itau", name: "Itau", color: "#FF6A13", textColor: "#2A2117" },
  { id: "pichincha", name: "Banco Pichincha", color: "#FFCC00", textColor: "#2A2117" },
  { id: "finandina", name: "Finandina", color: "#6A1B9A", textColor: "#FFFFFF" },
  { id: "serfinanza", name: "Serfinanza", color: "#00A19A", textColor: "#FFFFFF" },
  { id: "movii", name: "Movii", color: "#00C853", textColor: "#2A2117" },
  { id: "lulobank", name: "Lulo Bank", color: "#5B2EFF", textColor: "#FFFFFF" },
  { id: "dale", name: "Dale!", color: "#00AEEF", textColor: "#FFFFFF" },
  { id: "paypal", name: "PayPal", color: "#003087", textColor: "#FFFFFF" },
  { id: "efectivo", name: "Efectivo", color: "#2E7D32", textColor: "#FFFFFF" },
];

type TabId = "cuentas" | "tarjetas" | "creditos" | "ahorro";
type EditableEntity =
  | ({ entityType: "cuenta" } & MoneyAccount)
  | ({ entityType: "tarjeta" } & MoneyCard)
  | ({ entityType: "ahorro" } & MoneySaving);

function money(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s?COP$/, "")
    .trim();
}

export default function AccountsScreen({
  defaultTab = "cuentas",
  data,
  onOpenMovements,
}: {
  defaultTab?: TabId;
  data: MoneyViewModel;
  onOpenMovements?: () => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [selectedEntity, setSelectedEntity] = useState<EditableEntity | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<string | null>(null);
  const [selectedFundingAccount, setSelectedFundingAccount] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [entityName, setEntityName] = useState("");
  const [entityAmount, setEntityAmount] = useState("");
  const [accountTypeValue, setAccountTypeValue] = useState("Wallet");
  const [accountEntityId, setAccountEntityId] = useState("nequi");
  const [cardIssuer, setCardIssuer] = useState("");
  const [cardLimit, setCardLimit] = useState("");
  const [cardCutOffDay, setCardCutOffDay] = useState("");
  const [cardPayDueDay, setCardPayDueDay] = useState("");
  const [cardMinimumPayment, setCardMinimumPayment] = useState("");
  const [cardAnnualInterestRate, setCardAnnualInterestRate] = useState("");
  const [cardInterestType, setCardInterestType] = useState("unknown");
  const [cardEstimatedPayoffMonths, setCardEstimatedPayoffMonths] = useState("");
  const [cardEstimatedTotalPayment, setCardEstimatedTotalPayment] = useState("");
  const [cardPaymentStrategy, setCardPaymentStrategy] = useState("minimum");
  const [cardNotes, setCardNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pocketReleaseDate, setPocketReleaseDate] = useState('');
  const [pocketAddAmount, setPocketAddAmount] = useState('');
  const [pocketAddAccountId, setPocketAddAccountId] = useState('');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (!selectedEntity) return;
    setEntityName(selectedEntity.name);
    if (selectedEntity.entityType === "cuenta") {
      setEntityAmount(String(selectedEntity.balance));
      setAccountTypeValue(selectedEntity.type);
      const matchedEntity =
        ACCOUNT_ENTITIES.find((item) => selectedEntity.entity && item.name.toLowerCase() === selectedEntity.entity.toLowerCase()) ??
        ACCOUNT_ENTITIES.find((item) => item.color.toLowerCase() === selectedEntity.color.toLowerCase());
      setAccountEntityId(matchedEntity?.id ?? "nequi");
    } else if (selectedEntity.entityType === "tarjeta") {
      setEntityAmount(String(selectedEntity.used));
      setCardIssuer(selectedEntity.issuer);
      setCardLimit(String(selectedEntity.limit));
      setCardCutOffDay(String(selectedEntity.cutOffDay));
      setCardPayDueDay(String(selectedEntity.payDueDay));
      setCardMinimumPayment(String(selectedEntity.minimumPayment));
      setCardAnnualInterestRate(selectedEntity.annualInterestRate == null ? "" : String(selectedEntity.annualInterestRate));
      setCardInterestType(selectedEntity.interestType);
      setCardEstimatedPayoffMonths(selectedEntity.estimatedPayoffMonths == null ? "" : String(selectedEntity.estimatedPayoffMonths));
      setCardEstimatedTotalPayment(selectedEntity.estimatedTotalPayment == null ? "" : String(selectedEntity.estimatedTotalPayment));
      setCardPaymentStrategy(selectedEntity.paymentStrategy);
      setCardNotes(selectedEntity.notes);
    } else {
      setEntityAmount(String(selectedEntity.current));
      setPocketReleaseDate(selectedEntity.dueDate || '');
      setPocketAddAmount('');
      setPocketAddAccountId(data.accounts[0]?.id ?? '');
    }
  }, [selectedEntity]);

  const tabs = [
    { id: "cuentas", label: "Cuentas" },
    { id: "tarjetas", label: "Tarjetas" },
    { id: "creditos", label: "Créditos" },
    { id: "ahorro", label: "Ahorro" },
  ] as const;

  const goals = data.savings.filter((item) => item.goalType === "goal");

  const hasData =
    (activeTab === "cuentas" && data.accounts.length > 0) ||
    (activeTab === "tarjetas" && data.cards.length > 0) ||
    (activeTab === "creditos" && data.bankCredits?.length > 0) ||
    (activeTab === "ahorro" && data.savings.length > 0);

  const savingsForDeposit = useMemo(() => goals.length > 0 ? goals : data.savings, [goals, data.savings]);

  const openEntity = (entity: EditableEntity) => {
    haptics.medium();
    setActionError(null);
    setSelectedEntity(entity);
    setIsEditModalOpen(true);
  };

  const closeEntity = () => {
    setIsEditModalOpen(false);
    setSelectedEntity(null);
    setActionError(null);
  };

  const handleSaveEntity = () => {
    if (!selectedEntity) return;
    const amount = Number(entityAmount || "0");
    setActionError(null);
    startTransition(async () => {
      try {
        if (selectedEntity.entityType === "cuenta") {
          const selectedAccountEntity = ACCOUNT_ENTITIES.find((item) => item.id === accountEntityId) ?? ACCOUNT_ENTITIES[0];
          await updateAccount({
            id: selectedEntity.id,
            name: entityName,
            entity: selectedAccountEntity.name,
            balance: amount,
            type: accountTypeValue,
            color: selectedAccountEntity.color,
          });
        } else if (selectedEntity.entityType === "tarjeta") {
          await updateCreditCardFull({
            id: selectedEntity.id,
            name: entityName,
            issuer: cardIssuer,
            limitValue: Number(cardLimit || "0"),
            used: amount,
            cutOffDate: Number(cardCutOffDay || "1"),
            payDueDate: Number(cardPayDueDay || "1"),
            minimumPayment: Number(cardMinimumPayment || "0"),
            annualInterestRate: cardAnnualInterestRate ? Number(cardAnnualInterestRate) : null,
            interestType: cardInterestType,
            estimatedPayoffMonths: cardEstimatedPayoffMonths ? Number(cardEstimatedPayoffMonths) : null,
            estimatedTotalPayment: cardEstimatedTotalPayment ? Number(cardEstimatedTotalPayment) : null,
            paymentStrategy: cardPaymentStrategy,
            notes: cardNotes,
          });
        } else {
          // savings goal: just update name, current, and due date
          await updateSavingsGoal({ id: selectedEntity.id, name: entityName, current: amount, dueDate: pocketReleaseDate || null });
          // If adding extra money to a pocket
          if (selectedEntity.goalType === 'pocket' && pocketAddAmount && Number(pocketAddAmount) > 0 && pocketAddAccountId) {
            await createSavingsContribution({
              goalId: selectedEntity.id,
              amount: Number(pocketAddAmount),
              accountId: pocketAddAccountId,
            });
          }
        }
        haptics.success();
        router.refresh();
        closeEntity();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "No se pudo guardar.");
        haptics.error();
      }
    });
  };

  const handleArchiveEntity = () => {
    if (!selectedEntity) return;
    setActionError(null);
    startTransition(async () => {
      try {
        if (selectedEntity.entityType === "cuenta") {
          await deleteAccount(selectedEntity.id);
        } else if (selectedEntity.entityType === "tarjeta") {
          await archiveCreditCard(selectedEntity.id);
        } else {
          await archiveSavingsGoal(selectedEntity.id);
        }
        haptics.success();
        router.refresh();
        closeEntity();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "No se pudo eliminar.");
        haptics.error();
      }
    });
  };

  const handleReleasePocket = (pocketId: string) => {
    setActionError(null);
    startTransition(async () => {
      try {
        await releasePocket({
          goalId: pocketId,
        });
        haptics.success();
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "No se pudo liberar el bolsillo.");
        haptics.error();
      }
    });
  };

  const handleDeposit = () => {
    if (!selectedMeta || !depositAmount || !selectedFundingAccount) return;
    setActionError(null);
    startTransition(async () => {
      try {
        await createSavingsContribution({
          goalId: selectedMeta,
          amount: Number(depositAmount),
          accountId: selectedFundingAccount,
        });
        haptics.success();
        router.refresh();
        setIsDepositModalOpen(false);
        setDepositAmount("");
        setSelectedMeta(null);
        setSelectedFundingAccount(null);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "No se pudo registrar el aporte.");
        haptics.error();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
      <section className="card-arca overflow-hidden p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-arca-text-dim uppercase font-bold tracking-widest">Gastos registrados este mes</p>
              <span className="text-[9px] font-bold uppercase tracking-wider text-arca-accent">{data.spending.monthLabel}</span>
            </div>
            <h4 className="mt-1 text-2xl font-black tracking-tight text-arca-text-primary light:text-arca-light-text-primary">{data.spending.totalLabel}</h4>
            <p className="mt-1 text-[9px] text-arca-text-dim">Salidas reales del mes · no es tu saldo disponible</p>
          </div>
          {data.spending.changePercent == null ? (
            <span className="rounded-full border border-arca-border bg-arca-surface-2 px-2.5 py-1.5 text-[9px] font-bold text-arca-text-dim">Primer mes medido</span>
          ) : (
            <span className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${data.spending.changePercent <= 0 ? 'border-arca-positive/25 bg-arca-positive/10 text-arca-positive' : 'border-arca-alert/25 bg-arca-alert/10 text-arca-alert'}`}>
              {data.spending.changePercent <= 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
              {Math.abs(data.spending.changePercent)}% vs. mes anterior
            </span>
          )}
        </div>

        <div className="relative mx-auto mt-2 h-44 w-full max-w-[240px]">
          {data.spending.breakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.spending.breakdown} cx="50%" cy="50%" innerRadius={56} outerRadius={78} paddingAngle={3} dataKey="value" stroke="#100d09" strokeWidth={3}>
                    {data.spending.breakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => money(Number(value))}
                    contentStyle={{
                      backgroundColor: "#1E1811",
                      borderRadius: "12px",
                      border: "1px solid #33291B",
                      fontSize: "10px",
                      fontWeight: "bold",
                      color: "#F3ECDC",
                    }}
                    itemStyle={{ color: "#F3ECDC" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-arca-text-primary">
                  {data.spending.budgetUsagePercent != null ? `${data.spending.budgetUsagePercent}%` : `${data.spending.breakdown[0]?.percentage ?? 0}%`}
                </span>
                <span className="max-w-20 text-[9px] font-bold uppercase leading-tight tracking-wider text-arca-text-dim">
                  {data.spending.budgetUsagePercent != null ? 'del presupuesto' : 'categoría principal'}
                </span>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-arca-text-dim">Aún no hay gastos reales este mes.</div>
          )}
        </div>

        <div className="mt-2 space-y-3">
          {data.spending.breakdown.map((item) => (
            <div key={item.name}>
              <div className="mb-1.5 flex items-center gap-2">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-arca-text-secondary">{item.name}</span>
                <span className="text-[11px] font-bold text-arca-text-primary">{money(item.value)}</span>
                <span className="w-8 text-right text-[10px] font-bold text-arca-text-dim">{item.percentage}%</span>
              </div>
              <div className="ml-4 h-1.5 overflow-hidden rounded-full bg-arca-surface-2">
                <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>

      </section>

      <div className="px-2">
        <CalculationHelper
          title="Gastos registrados este mes"
          description="Suma todas las salidas reales que registraste durante el mes. Esta cifra explica en qué se fue el dinero, pero no representa cuánto tienes actualmente."
          formula="Gastos + pagos de deudas + pagos de tarjetas del mes"
          includes={["Compras y gastos", "Pagos de deudas", "Pagos de tarjetas"]}
          excludes={["Transferencias entre cuentas", "Ingresos", "Saldo actual"]}
        />
      </div>

      {data.spending.breakdown[0] ? (
        <aside className="mx-2 flex items-start gap-2.5 border-l border-arca-accent/35 py-1 pl-3">
          <Sparkles className="mt-0.5 shrink-0 text-arca-accent" size={15} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] leading-relaxed text-arca-text-dim">
              <span className="font-bold text-arca-text-secondary">Nota de Nova:</span> {data.spending.breakdown[0].name} concentra el {data.spending.breakdown[0].percentage}% de tus gastos.
              {data.spending.breakdown[0].percentage >= 45 ? ' Podrías revisar si existe margen para reducirlo.' : ' La distribución se mantiene equilibrada.'}
            </p>
            <button type="button" onClick={onOpenMovements} className="mt-1.5 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-arca-accent">
              Ver movimientos
              <ArrowRight size={12} />
            </button>
          </div>
        </aside>
      ) : null}
      </div>

      <div className="flex bg-arca-surface-2 light:bg-arca-light-surface-2 p-1 rounded-full border border-arca-border light:border-arca-light-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
              activeTab === tab.id ? "bg-arca-surface-1 light:bg-arca-light-surface-1 text-arca-accent light:text-arca-light-accent shadow-sm" : "text-arca-text-dim"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {!hasData ? (
          <button
            onClick={() => {
              haptics.medium();
              const segmentMap: Record<TabId, string> = {
                cuentas: "Cuenta",
                tarjetas: "Tarjeta",
                creditos: "Credito",
                ahorro: "Ahorro",
              };
              window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: segmentMap[activeTab] } }));
            }}
            className="w-full py-12 flex flex-col items-center text-center space-y-4 cursor-pointer hover:bg-arca-surface-2/30 rounded-2xl transition-all border border-dashed border-arca-border"
          >
            <div className="w-16 h-16 rounded-full bg-arca-surface-2 flex items-center justify-center border border-arca-border">
              <Plus size={32} className="text-arca-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-arca-text-primary light:text-arca-light-text-primary uppercase tracking-widest">
                Crear {activeTab === "cuentas" ? "cuenta" : activeTab === "tarjetas" ? "tarjeta de crédito" : "meta de ahorro"}
              </p>
              <p className="text-xs text-arca-text-dim mt-1">
                Toca aquí para registrar tu primera {activeTab === "cuentas" ? "cuenta" : activeTab === "tarjetas" ? "tarjeta de crédito" : "meta de ahorro"} ahora mismo.
              </p>
            </div>
          </button>
        ) : (
          <>
            {activeTab === "cuentas" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1 mb-2">
                  <span className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Mis cuentas</span>
                  <button
                    onClick={() => {
                      haptics.medium();
                      window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Cuenta" } }));
                    }}
                    className="w-8 h-8 rounded-lg bg-arca-accent/10 flex items-center justify-center text-arca-accent hover:bg-arca-accent hover:text-white transition-all animate-pulse"
                    title="Nueva cuenta"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {data.accounts.map((acc) => (
                  <AccountRow key={acc.id} account={acc} onClick={() => openEntity({ ...acc, entityType: "cuenta" })} />
                ))}
              </div>
            )}

            {activeTab === "tarjetas" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1 mb-2">
                  <span className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Mis tarjetas</span>
                  <button
                    onClick={() => {
                      haptics.medium();
                      window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Tarjeta" } }));
                    }}
                    className="w-8 h-8 rounded-lg bg-arca-accent/10 flex items-center justify-center text-arca-accent hover:bg-arca-accent hover:text-white transition-all"
                    title="Nueva tarjeta"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {data.cards.map((card) => (
                  <WalletCard
                    key={card.id}
                    name={card.name}
                    issuer={card.issuer}
                    used={card.used}
                    limit={card.limit}
                    dueDate={card.dueDateLabel}
                    color={card.color}
                    darkText={card.darkText}
                    minPayment={card.minimumPayment}
                    onClick={() => openEntity({ ...card, entityType: "tarjeta" })}
                  />
                ))}
              </div>
            )}

            {activeTab === "creditos" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1 mb-2">
                  <span className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Créditos Bancarios</span>
                  <button
                    onClick={() => {
                      haptics.medium();
                      window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Credito" } }));
                    }}
                    className="w-8 h-8 rounded-lg bg-arca-accent/10 flex items-center justify-center text-arca-accent hover:bg-arca-accent hover:text-white transition-all"
                    title="Nuevo crédito"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {data.bankCredits?.map((credit) => (
                  <BankCreditCard
                    key={credit.id}
                    name={credit.name}
                    paidInstallments={credit.paidInstallments}
                    totalInstallments={credit.totalInstallments}
                    currentBalance={credit.currentBalance}
                    monthlyPayment={credit.monthlyPayment}
                    payDueDay={credit.payDueDay}
                    color={credit.color}
                    darkText={credit.darkText}
                    onClick={() => {
                      // TODO: openEntity
                    }}
                  />
                ))}
              </div>
            )}

            {activeTab === "ahorro" && (
              <div className="space-y-6">

                {/* METAS DE AHORRO */}

                {/* METAS DE AHORRO */}
                <section className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <div>
                      <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Metas de ahorro</h3>
                      <p className="text-[9px] text-arca-text-dim mt-0.5">Objetivos que estás construyendo en el tiempo</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          haptics.medium();
                          setActionError(null);
                          setSelectedFundingAccount(data.accounts[0]?.id ?? null);
                          setIsDepositModalOpen(true);
                        }}
                        className="h-8 px-3 rounded-lg bg-arca-accent/10 flex items-center justify-center text-arca-accent text-xs font-bold hover:bg-arca-accent hover:text-white transition-all"
                      >
                        Aportar
                      </button>
                      <button
                        onClick={() => {
                          haptics.medium();
                          window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Ahorro" } }));
                        }}
                        className="w-8 h-8 rounded-lg bg-arca-accent/10 flex items-center justify-center text-arca-accent hover:bg-arca-accent hover:text-white transition-all"
                        title="Nueva meta"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {goals.length > 0 ? (
                    <div className="card-arca p-5 space-y-4">
                      {goals.map((goal) => (
                        <div
                          key={goal.id}
                          onClick={() => openEntity({ ...goal, entityType: "ahorro" })}
                          className="space-y-2 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <div className="flex justify-between items-baseline">
                            <p className="text-xs font-bold text-arca-text-primary">{goal.name}</p>
                            <p className="text-[10px] font-medium text-arca-text-dim">
                              {goal.currentLabel} / {goal.targetLabel}
                            </p>
                          </div>
                          <div className="h-1.5 w-full bg-arca-surface-2 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${goal.progress}%` }} className="h-full bg-arca-accent rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Ahorro" } }))}
                      className="card-arca p-5 flex flex-col items-center justify-center gap-2 cursor-pointer border border-dashed border-arca-border hover:border-arca-accent/40 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-arca-accent/10 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-arca-accent">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </div>
                      <p className="text-xs font-bold text-arca-text-dim text-center">Define metas para objetivos a mediano o largo plazo</p>
                      <p className="text-[10px] text-arca-accent font-bold">+ Nueva meta</p>
                    </div>
                  )}
                </section>

              </div>
            )}

          </>
        )}
      </div>

      <AnimatePresence>
        {isEditModalOpen && selectedEntity && (
          <div className="fixed inset-0 z-[550] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeEntity} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg max-h-[88dvh] overflow-hidden bg-arca-surface-1 rounded-t-[32px] shadow-2xl"
            >
              <div className="sticky top-0 z-10 bg-arca-surface-1 px-8 pt-5 pb-4 border-b border-arca-border/60">
                <div className="w-12 h-1.5 bg-arca-border rounded-full mx-auto mb-5" />
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-xl font-bold text-arca-text-primary uppercase tracking-tight truncate">Gestionar {selectedEntity.name}</h3>
                    <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">
                      {selectedEntity.entityType === "cuenta"
                        ? selectedEntity.type
                        : selectedEntity.entityType === "tarjeta"
                        ? selectedEntity.issuer
                        : selectedEntity.goalType === "pocket" ? "Bolsillo · Dinero protegido" : "Meta de ahorro"}
                    </p>
                  </div>
                  {selectedEntity.entityType === "ahorro" && selectedEntity.goalType === "pocket" ? (
                    <div className="w-12 h-12 rounded-2xl bg-arca-positive/10 flex items-center justify-center shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-arca-positive">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-arca-accent/10 flex items-center justify-center text-arca-accent shrink-0">
                      <Edit2 size={20} />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 overflow-y-auto px-8 py-6 max-h-[calc(88dvh-96px)]">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Nombre</label>
                  <input
                    type="text"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    className="w-full h-14 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent"
                  />
                </div>

                {/* Pocket-specific fields */}
                {selectedEntity.entityType === "ahorro" && selectedEntity.goalType === "pocket" ? (
                  <>
                    {/* Balance display — read-only, shown as info */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Monto actual protegido</label>
                      <div className="rounded-2xl bg-arca-positive/8 border border-arca-positive/20 px-4 py-4 flex justify-between items-center">
                        <p className="text-xl font-bold text-arca-positive">{money(selectedEntity.current)}</p>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-arca-positive opacity-60">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                    </div>

                    {/* Release date */}
                    <div className="space-y-2 mt-4">
                      <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">¿Cuándo planeas usarlo?</label>
                      <input
                        type="date"
                        value={pocketReleaseDate}
                        onChange={(e) => setPocketReleaseDate(e.target.value)}
                        className="w-full h-14 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-positive"
                      />
                    </div>

                    {/* Agregar más dinero */}
                    <div className="w-full h-[1px] bg-arca-border my-6" />
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Aportar más dinero</p>
                        <p className="text-[10px] text-arca-text-dim ml-1">Puedes agregar dinero a este bolsillo desde cualquiera de tus cuentas.</p>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-arca-text-dim font-bold">$</span>
                        <input
                          type="number"
                          value={pocketAddAmount}
                          onChange={(e) => setPocketAddAmount(e.target.value)}
                          placeholder="Monto a sumar"
                          className="w-full h-14 pl-8 pr-4 bg-arca-surface-2 border border-arca-border rounded-xl text-lg font-bold text-arca-text-primary focus:outline-none focus:border-arca-positive"
                        />
                      </div>
                      <select
                        value={pocketAddAccountId}
                        onChange={(e) => setPocketAddAccountId(e.target.value)}
                        className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-positive appearance-none"
                      >
                        <option value="">¿De qué cuenta sale?</option>
                        {data.accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>{acc.name} — {acc.balanceLabel}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : selectedEntity.entityType !== "cuenta" && selectedEntity.entityType !== "tarjeta" ? (
                  // Goal: show editable amount
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Lo que llevas ahorrado</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-arca-text-dim font-bold">$</span>
                      <input
                        type="number"
                        value={entityAmount}
                        onChange={(e) => setEntityAmount(e.target.value)}
                        className="w-full h-14 pl-8 pr-4 bg-arca-surface-2 border border-arca-border rounded-xl text-lg font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      />
                    </div>
                  </div>
                ) : (
                  // Cuenta / Tarjeta: original amount field
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">
                      {selectedEntity.entityType === "tarjeta" ? "Deuda actual" : "Saldo actual"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-arca-text-dim font-bold">$</span>
                      <input
                        type="number"
                        value={entityAmount}
                        onChange={(e) => setEntityAmount(e.target.value)}
                        className="w-full h-14 pl-8 pr-4 bg-arca-surface-2 border border-arca-border rounded-xl text-lg font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      />
                    </div>
                  </div>
                )}

                {selectedEntity.entityType === "cuenta" ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Entidad o marca</label>
                      <select
                        value={accountEntityId}
                        onChange={(e) => {
                          haptics.light();
                          setAccountEntityId(e.target.value);
                        }}
                        className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent appearance-none"
                      >
                        {ACCOUNT_ENTITIES.map((entity) => (
                          <option key={entity.id} value={entity.id}>
                            {entity.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Tipo de cuenta</label>
                      <select
                        value={accountTypeValue}
                        onChange={(e) => setAccountTypeValue(e.target.value)}
                        className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      >
                        <option>Ahorros</option>
                        <option>Corriente</option>
                        <option>Wallet</option>
                        <option>Efectivo</option>
                      </select>
                    </div>
                  </>
                ) : null}

                {selectedEntity.entityType === "cuenta" && (
                  <div className="space-y-3 mt-6">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Bolsillos de esta cuenta</label>
                      <button
                        type="button"
                        onClick={() => {
                          haptics.medium();
                          window.dispatchEvent(
                            new CustomEvent("open-register", {
                              detail: { segment: "Ahorro", goalType: "pocket", sourceAccountId: selectedEntity.id },
                            })
                          );
                        }}
                        className="text-[10px] font-bold text-arca-accent hover:opacity-80 transition-opacity"
                      >
                        + Crear
                      </button>
                    </div>

                    {selectedEntity.pockets && selectedEntity.pockets.length > 0 ? (
                      <div className="space-y-2">
                        {selectedEntity.pockets.map((pocket) => (
                          <div key={pocket.id} className="card-arca p-3 flex flex-col gap-2 transition-transform active:scale-[0.98]">
                            <div 
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => {
                                haptics.medium();
                                openEntity({ ...pocket, entityType: "ahorro", goalType: "pocket" });
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: pocket.color + '22' }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={pocket.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                  </svg>
                                </div>
                                <div className="flex flex-col justify-center">
                                  <span className="text-sm font-bold leading-tight">{pocket.name}</span>
                                  {pocket.dueDate && (
                                    <span className="text-[10px] text-arca-text-dim mt-0.5">Planeado para: {pocket.dueDate}</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm font-bold" style={{ color: pocket.color }}>{pocket.currentLabel}</span>
                            </div>
                            <div className="flex justify-end gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  haptics.medium();
                                  openEntity({ ...pocket, entityType: "ahorro", goalType: "pocket" });
                                }}
                                className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-arca-surface-2 text-arca-text-primary hover:bg-arca-surface-3 transition-colors"
                              >
                                Editar / Aportar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  haptics.medium();
                                  handleReleasePocket(pocket.id);
                                }}
                                className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-arca-alert/10 text-arca-alert hover:bg-arca-alert hover:text-white transition-colors"
                              >
                                Liberar saldo
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-arca-text-dim text-center py-4 bg-arca-surface-2 rounded-xl border border-dashed border-arca-border">
                        No hay bolsillos en esta cuenta.
                      </p>
                    )}
                  </div>
                )}

                {selectedEntity.entityType === "tarjeta" ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Emisor</label>
                      <input
                        type="text"
                        value={cardIssuer}
                        onChange={(e) => setCardIssuer(e.target.value)}
                        className="w-full h-14 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Cupo total">
                        <input type="number" value={cardLimit} onChange={(e) => setCardLimit(e.target.value)} className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent" />
                      </Field>
                      <Field label="Pago minimo">
                        <input type="number" value={cardMinimumPayment} onChange={(e) => setCardMinimumPayment(e.target.value)} className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent" />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Dia de corte">
                        <input type="number" value={cardCutOffDay} onChange={(e) => setCardCutOffDay(e.target.value)} className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent" />
                      </Field>
                      <Field label="Dia de pago">
                        <input type="number" value={cardPayDueDay} onChange={(e) => setCardPayDueDay(e.target.value)} className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent" />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Tasa anual">
                        <input type="number" step="0.01" value={cardAnnualInterestRate} onChange={(e) => setCardAnnualInterestRate(e.target.value)} className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent" />
                      </Field>
                      <Field label="Tipo interes">
                        <select value={cardInterestType} onChange={(e) => setCardInterestType(e.target.value)} className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent">
                          <option value="effective_annual">EA</option>
                          <option value="nominal_monthly">Nominal mensual</option>
                          <option value="unknown">Sin definir</option>
                        </select>
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Meses estimados">
                        <input type="number" value={cardEstimatedPayoffMonths} onChange={(e) => setCardEstimatedPayoffMonths(e.target.value)} className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent" />
                      </Field>
                      <Field label="Total estimado">
                        <input type="number" value={cardEstimatedTotalPayment} onChange={(e) => setCardEstimatedTotalPayment(e.target.value)} className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent" />
                      </Field>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Estrategia</label>
                      <select
                        value={cardPaymentStrategy}
                        onChange={(e) => setCardPaymentStrategy(e.target.value)}
                        className="w-full h-12 px-4 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      >
                        <option value="minimum">Pagar minimo</option>
                        <option value="fixed">Monto fijo</option>
                        <option value="avalanche">Reducir intereses</option>
                        <option value="snowball">Liberar cupo rapido</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Notas</label>
                      <textarea
                        rows={3}
                        value={cardNotes}
                        onChange={(e) => setCardNotes(e.target.value)}
                        className="w-full resize-none px-4 py-3 bg-arca-surface-2 border border-arca-border rounded-xl text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      />
                    </div>
                  </>
                ) : null}

                {actionError ? <div className="text-xs text-arca-alert">{actionError}</div> : null}

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={() => handleArchiveEntity()}
                    disabled={isPending}
                    className="h-14 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2 border disabled:opacity-60 bg-arca-alert/10 text-arca-alert border-arca-alert/20"
                  >
                    <Trash2 size={14} />
                    <span>{selectedEntity.entityType === "cuenta" ? "Eliminar" : "Archivar"}</span>
                  </button>
                  <button
                    onClick={handleSaveEntity}
                    disabled={isPending}
                    className="h-14 bg-arca-accent text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-arca-accent/20 disabled:opacity-60"
                  >
                    {isPending ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDepositModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsDepositModalOpen(false);
                setSelectedFundingAccount(null);
                setSelectedMeta(null);
                setDepositAmount("");
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-arca-surface-1 rounded-t-[32px] p-8 space-y-6 pb-12 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-arca-border rounded-full mx-auto" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-arca-text-primary">Aportar a ahorro</h3>
                <p className="text-xs text-arca-text-dim">Selecciona una meta o bolsillo y registra el aporte.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {savingsForDeposit.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => {
                        haptics.light();
                        setSelectedMeta(goal.id);
                      }}
                      className={`p-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                        selectedMeta === goal.id ? "bg-arca-accent text-white border-arca-accent shadow-lg shadow-arca-accent/20" : "bg-arca-surface-2 text-arca-text-dim border-arca-border"
                      }`}
                    >
                      {goal.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Sale de esta cuenta</label>
                  <div className="grid grid-cols-1 gap-2">
                    {data.accounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => {
                          haptics.light();
                          setSelectedFundingAccount(account.id);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedFundingAccount === account.id
                            ? "bg-arca-accent text-white border-arca-accent shadow-lg shadow-arca-accent/20"
                            : "bg-arca-surface-2 text-arca-text-primary border-arca-border"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: account.color }} />
                            <div>
                            <p className="text-xs font-bold uppercase tracking-widest">{account.name}</p>
                            <p className={`text-[10px] uppercase tracking-wider ${selectedFundingAccount === account.id ? "text-white/80" : "text-arca-text-dim"}`}>
                              {account.type}
                            </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold">{account.balanceLabel}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Monto a depositar</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-arca-text-dim font-bold">$</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full h-14 pl-8 pr-4 bg-arca-surface-2 border border-arca-border rounded-xl text-lg font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent"
                    />
                  </div>
                </div>

                {actionError ? <div className="text-xs text-arca-alert">{actionError}</div> : null}

                <button
                  onClick={handleDeposit}
                  disabled={!selectedMeta || !depositAmount || !selectedFundingAccount || isPending}
                  className="w-full h-14 bg-arca-accent text-white rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-arca-accent/20 disabled:opacity-50 disabled:shadow-none"
                >
                  {isPending ? "Confirmando..." : "Confirmar depósito"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountRow({ account, onClick }: { account: MoneyAccount; onClick: () => void }) {
  const pocketsTotal = account.pockets.reduce((sum, p) => sum + p.current, 0);
  const totalInBank = account.balance + pocketsTotal;
  
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative overflow-hidden p-5 rounded-3xl cursor-pointer active:brightness-95 transition-all border"
      style={{
        backgroundColor: `${account.color}15`,
        borderColor: `${account.color}30`,
        boxShadow: `0 4px 24px -8px ${account.color}40`,
      }}
    >
      {/* Background Glow */}
      <div 
        className="absolute -top-10 -left-10 w-32 h-32 rounded-full blur-[40px] opacity-40 pointer-events-none" 
        style={{ backgroundColor: account.color }}
      />
      
      <div className="relative z-10 flex flex-col gap-4">
        {/* Header: Name (No solid square) */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-lg font-bold text-arca-text-primary light:text-arca-light-text-primary">{account.name}</p>
            <p className="text-[10px] text-arca-text-dim uppercase font-bold tracking-wider">
              {account.entity ? `${account.entity} · ${account.type}` : account.type}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-40" style={{ backgroundColor: `${account.color}30` }}>
            <Wallet size={14} style={{ color: account.color }} />
          </div>
        </div>

        {/* Balances */}
        <div className="flex justify-between items-end mt-1">
          <div>
            <p className="text-[9px] font-bold text-arca-text-dim uppercase tracking-widest mb-1">Total</p>
            <h4 className="text-2xl font-bold text-arca-text-primary light:text-arca-light-text-primary leading-none">
              {money(totalInBank)}
            </h4>
          </div>
          
          {pocketsTotal > 0 && (
            <div className="text-right">
              <p className="text-[9px] font-bold text-arca-text-dim uppercase tracking-widest mb-1">Disponible</p>
              <p className="text-[17px] font-bold text-arca-text-primary light:text-arca-light-text-primary leading-none">
                {account.balanceLabel}
              </p>
            </div>
          )}
        </div>

        {/* Pockets */}
        {account.pockets.length > 0 && (
          <div className="mt-2 pt-3 border-t border-white/5 space-y-2.5">
            <p className="text-[9px] font-bold text-arca-text-dim uppercase tracking-widest">Bolsillos</p>
            {account.pockets.map((pocket) => (
              <div key={pocket.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <PiggyBank size={14} style={{ color: pocket.color }} />
                  <span className="text-[11px] font-semibold text-arca-text-primary/90">{pocket.name}</span>
                </div>
                <span className="text-xs font-bold text-arca-text-primary">{pocket.currentLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function WalletCard({
  name,
  issuer,
  used,
  limit,
  dueDate,
  color,
  darkText,
  minPayment,
  onClick,
}: {
  name: string;
  issuer: string;
  used: number;
  limit: number;
  dueDate: string;
  color: string;
  darkText: boolean;
  minPayment?: number;
  onClick: () => void;
}) {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const available = Math.max(limit - used, 0);
  const tone =
    percentage >= 100 ? "full" :
    percentage >= 80 ? "warning" :
    "healthy";

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="rounded-2xl p-5 border border-arca-border light:border-arca-light-border relative overflow-hidden cursor-pointer active:brightness-95"
      style={{ backgroundColor: color }}
    >
      <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-white/10" />

      <div className={`relative z-10 space-y-6 ${darkText ? "text-[#2A2117]" : "text-white"}`}>
        <div className="flex justify-between items-start">
          <CardIcon size={24} opacity={0.8} />
          <div className="text-right space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">Vence {dueDate}</span>
            <span
              className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
                tone === "full"
                  ? "bg-black/25 text-white"
                  : tone === "warning"
                    ? "bg-white/20 text-white"
                    : "bg-white/16 text-white"
              }`}
            >
              {tone === "full" ? "Cupo lleno" : tone === "warning" ? "Uso alto" : "Disponible"}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium opacity-80">{name}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">{issuer}</p>
          <p className="text-xl font-bold mt-1">{money(used)}</p>
          <div className="flex justify-between items-center mt-2">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
              Disponible: {money(available)}
            </p>
            {minPayment != null && minPayment > 0 && (
              <p className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                darkText ? "bg-black/10 text-[#2A2117]" : "bg-black/25 text-white"
              }`}>
                Cuota: {money(minPayment)}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                tone === "full" ? "bg-[#FFE0D8]" : tone === "warning" ? "bg-[#FFF1CC]" : "bg-white/60"
              }`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider opacity-60">
            <span>{Math.round(percentage)}% usado</span>
            <span>Cupo: {money(limit)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BankCreditCard({
  name,
  paidInstallments,
  totalInstallments,
  currentBalance,
  monthlyPayment,
  payDueDay,
  color,
  darkText,
  onClick,
}: {
  name: string;
  paidInstallments: number;
  totalInstallments: number;
  currentBalance: number;
  monthlyPayment: number;
  payDueDay: number;
  color: string;
  darkText: boolean;
  onClick: () => void;
}) {
  const percentage = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="rounded-2xl p-5 border border-arca-border light:border-arca-light-border relative overflow-hidden cursor-pointer active:brightness-95"
      style={{ backgroundColor: color }}
    >
      <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-white/10" />

      <div className={`relative z-10 space-y-6 ${darkText ? "text-[#2A2117]" : "text-white"}`}>
        <div className="flex justify-between items-start">
          <CardIcon size={24} opacity={0.8} />
          <div className="text-right space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">Pago día {payDueDay}</span>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight truncate">{name}</h3>
          <p className="text-xs opacity-80">Cuota: {money(monthlyPayment)}</p>
        </div>

        <div className="flex items-end justify-between pt-2">
          <div className="space-y-1">
            <span className="block text-[9px] font-bold uppercase tracking-widest opacity-70">Saldo</span>
            <span className="block text-lg font-black">{money(currentBalance)}</span>
          </div>
          <div className="text-right space-y-1">
            <span className="block text-[9px] font-bold uppercase tracking-widest opacity-70">Progreso</span>
            <span className="block text-sm font-bold">{paidInstallments} de {totalInstallments}</span>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
        <div className="h-full bg-white/50" style={{ width: `${percentage}%` }} />
      </div>
    </motion.div>
  );
}

function SavingPocket({
  name,
  current,
  target,
  progress,
  color,
  onClick,
}: {
  name: string;
  current: string;
  target: string;
  progress: number;
  color: string;
  onClick: () => void;
}) {
  const isGoalReached = progress >= 100;

  useEffect(() => {
    if (isGoalReached) {
      haptics.success();
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#C68A45", "#8FA66A", "#F3ECDC"],
      });
    }
  }, [isGoalReached]);

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`card-arca p-4 space-y-3 relative overflow-hidden transition-colors cursor-pointer active:bg-arca-surface-2 ${isGoalReached ? "bg-arca-positive/10 border-arca-positive" : ""}`}
    >
      {isGoalReached && (
        <div className="absolute -right-4 -top-4 opacity-10">
          <Trophy size={80} className="text-arca-positive rotate-12" />
        </div>
      )}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isGoalReached ? "bg-arca-positive" : "bg-arca-positive/10"}`}>
            <PiggyBank size={16} className={isGoalReached ? "text-white" : "text-arca-positive"} />
          </div>
          <p className="text-sm font-semibold text-arca-text-primary light:text-arca-light-text-primary">{name}</p>
        </div>
        <span className={`${isGoalReached ? "text-arca-positive" : "text-arca-positive light:text-arca-light-positive"} text-xs font-bold`}>{progress}%</span>
      </div>

      <div className="space-y-1.5">
        <div className="h-2 w-full bg-arca-surface-2 light:bg-arca-light-surface-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${isGoalReached ? "shadow-[0_0_12px_rgba(143,166,106,0.6)]" : ""}`}
            style={{ width: `${progress}%`, backgroundColor: color }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-medium text-arca-text-dim">
          <span>{current}</span>
          <span>Meta: {target}</span>
        </div>
      </div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2 block">
      <span className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">{label}</span>
      {children}
    </label>
  );
}

