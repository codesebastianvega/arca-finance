import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Plus,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { ArcaCharts } from "@/components/arca-charts";
import { Badge, Button, Card, MetricCard } from "@/components/ui-kit";
import {
  formatCOP,
  formatDate,
  getAvailableToday,
  getCardAvailable,
  getDebtTotal,
  getExpenseMonth,
  getIncomeMonth,
  getNetFlow,
  getSavingsProgress,
  getUpcomingPayments,
} from "@/lib/finance";
import { loadDashboardData } from "@/lib/dashboard-data";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Cuentas", icon: Wallet },
  { label: "Ingresos", icon: ArrowRight },
  { label: "Gastos", icon: CreditCard },
  { label: "Deudas", icon: AlertTriangle },
  { label: "Tarjetas", icon: CreditCard },
  { label: "Ahorro", icon: PiggyBank },
  { label: "Calendario", icon: CalendarDays },
];

const fallbackFlowData = [
  { name: "Ago", value: 4800000 },
  { name: "Sep", value: 5100000 },
  { name: "Oct", value: 4620000 },
  { name: "Nov", value: 5380000 },
  { name: "Dic", value: 5960000 },
];

function getMonthLabel(value: string) {
  return new Date(value).toLocaleDateString("es-CO", {
    month: "short",
    timeZone: "UTC",
  });
}

export default async function Home() {
  const { source, accounts, business, cards, debts, events, goals, projections, transactions } =
    await loadDashboardData();

  const availableToday = getAvailableToday(accounts, goals, debts, cards);
  const incomeMonth = getIncomeMonth(transactions);
  const expenseMonth = getExpenseMonth(transactions);
  const flowMonth = getNetFlow(transactions);
  const debtTotal = getDebtTotal(debts, cards);
  const upcoming = getUpcomingPayments(transactions);
  const futureEvents = events.slice(0, 8);
  const augustProjection = projections.find((item) => item.month.startsWith("2026-08"));
  const flowData = projections.length
    ? projections.map((item) => ({ name: getMonthLabel(item.month), value: item.closingBalance }))
    : fallbackFlowData;
  const sourceData = business.map((item) => ({ name: item.name, value: item.income }));

  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] overflow-hidden rounded-[28px] border border-black/8 bg-[var(--surface)] shadow-[0_18px_50px_rgba(17,17,17,0.08)] md:min-h-[calc(100vh-3rem)]">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-black/8 bg-[rgba(244,236,226,0.72)] p-5 lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-black/45">Arca</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#111111]">Control claro de caja.</h1>
            <p className="mt-3 text-sm leading-6 text-black/60">
              Registro manual, proyeccion, deudas, tarjetas y operacion por unidad.
            </p>
          </div>

          <Button className="mt-6 w-full justify-start" size="lg">
            <Plus className="h-4 w-4" />
            Registrar movimiento
          </Button>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href="#"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-black/70 transition-colors hover:bg-black/5 hover:text-black"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <Card className="mt-auto p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-black/55">Estado MCP</p>
            <p className="mt-2 text-sm leading-6 text-black/70">
              Preparado para conectar una IA que registre gastos, deudas y compras
              con lenguaje natural.
            </p>
            <Badge className="mt-4" tone={source === "supabase" ? "success" : "warning"}>
              {source === "supabase" ? "Supabase conectado" : "Usando mock local"}
            </Badge>
          </Card>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-black/8 px-4 py-4 md:px-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-black/45">Arca Finance</p>
              <h2 className="mt-1 text-xl font-semibold text-[#111111] md:text-2xl">
                Dashboard operativo
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone="warning">COP</Badge>
              <Badge tone={source === "supabase" ? "success" : "warning"}>
                {source === "supabase" ? "Supabase" : "Mock"}
              </Badge>
              <Button variant="secondary" className="hidden sm:inline-flex">
                Ver resumen
              </Button>
              <Button>
                <Plus className="h-4 w-4" />
                Registrar
              </Button>
            </div>
          </header>

          <div className="shell-grid flex-1 overflow-y-auto p-4 md:p-6">
            <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
              <Card className="overflow-hidden p-5 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/55">Resumen del mes</p>
                    <h3 className="mt-1 text-2xl font-semibold text-[#111111]">
                      Caja real y presion futura
                    </h3>
                  </div>
                  <p className="max-w-xl text-sm leading-6 text-black/60">
                    Arca combina saldos, pagos proximos y metas bloqueadas para decirte
                    cuanto puedes gastar sin desordenar el mes.
                  </p>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Disponible hoy" value={formatCOP(availableToday)} tone="success" />
                  <MetricCard label="Ingresos del mes" value={formatCOP(incomeMonth)} tone="neutral" />
                  <MetricCard label="Gastos del mes" value={formatCOP(expenseMonth)} tone="danger" />
                  <MetricCard
                    label="Flujo neto"
                    value={formatCOP(flowMonth)}
                    tone={flowMonth >= 0 ? "success" : "danger"}
                  />
                </div>
              </Card>

              <Card className="p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/55">Accion rapida</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#111111]">Registro conversacional</h3>
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-black/70">
                  <div className="rounded-2xl bg-black/3 p-3">
                    &quot;Gaste 38 mil de Nequi en almuerzo&quot;
                  </div>
                  <div className="rounded-2xl bg-black/3 p-3">
                    &quot;Compre tarjeta Nu en mercado por 180 mil a 3 cuotas&quot;
                  </div>
                  <div className="rounded-2xl bg-black/3 p-3">
                    &quot;Saque una deuda con Solventa por 900 mil&quot;
                  </div>
                </div>
                <Button className="mt-5 w-full">
                  <Plus className="h-4 w-4" />
                  Abrir MCP / registrar
                </Button>
              </Card>
            </div>

            <div className="mt-4">
              <ArcaCharts flowData={flowData} sourceData={sourceData} />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              <Card className="p-5 xl:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/55">Proximos pagos</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#111111]">Lo que aprieta el mes</h3>
                  </div>
                  <Badge tone="danger">{upcoming.length} pendientes</Badge>
                </div>
                <div className="mt-4 divide-y divide-black/8">
                  {upcoming.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="font-medium text-[#111111]">{item.concept}</p>
                        <p className="text-sm text-black/55">
                          {item.category} - vence {formatDate(item.dueDate ?? item.date)}
                        </p>
                      </div>
                      <p className="font-semibold text-[#111111]">{formatCOP(item.amount)}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-black/55">Deuda y tarjeta</p>
                  <h3 className="mt-1 text-lg font-semibold text-[#111111]">Vida crediticia</h3>
                </div>
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl bg-black/3 p-4">
                    <p className="text-sm text-black/55">Deuda total</p>
                    <p className="mt-1 text-2xl font-semibold text-[#111111]">{formatCOP(debtTotal)}</p>
                  </div>
                  {cards.map((card) => (
                    <div key={card.id} className="rounded-2xl border border-black/8 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-[#111111]">{card.name}</p>
                          <p className="text-sm text-black/55">
                            Corte {card.cutOffDate} - pago {card.payDueDate}
                          </p>
                        </div>
                        <Badge tone="warning">cupo</Badge>
                      </div>
                      <p className="mt-3 text-sm text-black/55">
                        Disponible {formatCOP(getCardAvailable(card))}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#111111]">
                        Minimo {formatCOP(card.minimumPayment)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/55">Proyeccion</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#111111]">Julio a diciembre</h3>
                  </div>
                  {augustProjection ? (
                    <Badge tone="success">Agosto inicia {formatCOP(augustProjection.openingBalance)}</Badge>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {projections.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-black/8 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-black/45">
                        {getMonthLabel(item.month)}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[#111111]">
                        {formatCOP(item.closingBalance)}
                      </p>
                      <p className="mt-1 text-sm text-black/55">
                        Ingresos {formatCOP(item.expectedIncome)}
                      </p>
                      <p className="text-sm text-black/55">
                        Salidas {formatCOP(item.expectedExpenses + item.debtPayments + item.cardPayments)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-black/55">Calendario</p>
                  <h3 className="mt-1 text-lg font-semibold text-[#111111]">Eventos futuros</h3>
                </div>
                <div className="mt-4 divide-y divide-black/8">
                  {futureEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="font-medium text-[#111111]">{event.title}</p>
                        <p className="text-sm text-black/55">
                          {event.eventType} - {formatDate(event.eventDate)}
                        </p>
                      </div>
                      <p className="font-semibold text-[#111111]">{formatCOP(event.amount)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              <Card className="p-5 xl:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/55">Unidades</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#111111]">Resultado por negocio</h3>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  {business.map((unit) => (
                    <div
                      key={unit.id}
                      className="grid gap-3 rounded-2xl border border-black/8 p-4 md:grid-cols-[1.5fr_1fr_1fr] md:items-center"
                    >
                      <div>
                        <p className="font-medium text-[#111111]">{unit.name}</p>
                        <p className="text-sm text-black/55">Cobros pendientes {formatCOP(unit.pending)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-black/45">Ingresos</p>
                        <p className="mt-1 font-semibold text-[#111111]">{formatCOP(unit.income)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-black/45">Gastos</p>
                        <p className="mt-1 font-semibold text-[#111111]">{formatCOP(unit.expense)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-black/55">Ahorro</p>
                  <h3 className="mt-1 text-lg font-semibold text-[#111111]">Metas activas</h3>
                </div>
                <div className="mt-4 space-y-4">
                  {goals.map((goal) => {
                    const progress = getSavingsProgress(goal);

                    return (
                      <div key={goal.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-[#111111]">{goal.name}</span>
                          <span className="text-black/55">{progress}%</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-black/6">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: goal.color,
                            }}
                          />
                        </div>
                        <p className="mt-2 text-sm text-black/55">
                          {formatCOP(goal.current)} de {formatCOP(goal.target)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/55">Cuentas</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#111111]">Donde esta la plata</h3>
                  </div>
                  <Badge tone="neutral">{accounts.length} activas</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between rounded-2xl border border-black/8 p-4"
                    >
                      <div>
                        <p className="font-medium text-[#111111]">{account.name}</p>
                        <p className="text-sm text-black/55">{account.type}</p>
                      </div>
                      <p className="font-semibold text-[#111111]">{formatCOP(account.balance)}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/55">Ultimos movimientos</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#111111]">Registro reciente</h3>
                  </div>
                </div>
                <div className="mt-4 divide-y divide-black/8">
                  {transactions.slice(0, 4).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="font-medium text-[#111111]">{tx.concept}</p>
                        <p className="text-sm text-black/55">
                          {tx.category} - {tx.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#111111]">{formatCOP(tx.amount)}</p>
                        <p className="text-sm text-black/55">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
