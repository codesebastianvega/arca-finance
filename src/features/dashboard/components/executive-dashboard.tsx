import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const DATA = [
  { name: 'Ene', ingresos: 4500, gastos: 3200, flujo: 1300 },
  { name: 'Feb', ingresos: 4800, gastos: 3500, flujo: 1300 },
  { name: 'Mar', ingresos: 4200, gastos: 3800, flujo: 400 },
  { name: 'Abr', ingresos: 5100, gastos: 3100, flujo: 2000 },
  { name: 'May', ingresos: 4900, gastos: 3400, flujo: 1500 },
  { name: 'Jun', ingresos: 5500, gastos: 4000, flujo: 1500 },
];

export default function ExecutiveDashboard({ onBack }: { onBack: () => void }) {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [forecast, setForecast] = useState<string | null>(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [spendingInsight, setSpendingInsight] = useState<string | null>(null);
  const [isLoadingSpendingInsight, setIsLoadingSpendingInsight] = useState(false);

  useEffect(() => {
    async function fetchWithDelay(url: string, body: any, delay: number) {
      await new Promise(resolve => setTimeout(resolve, delay));
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok || !contentType.includes('application/json')) {
        return null;
      }

      return res.json();
    }

    async function fetchAI() {
      setIsLoadingInsight(true);
      setIsLoadingForecast(true);
      setIsLoadingSpendingInsight(true);
      
      try {
        // Stagger requests by 1 second each
        const insightData = await fetchWithDelay('/api/insights', { spendingData: DATA }, 0);
        setInsight(insightData?.insight ?? null);
        setIsLoadingInsight(false);

        const forecastData = await fetchWithDelay('/api/forecast', { spendingData: DATA }, 1000);
        setForecast(forecastData?.forecast ?? null);
        setIsLoadingForecast(false);

        const spendingDataRes = await fetchWithDelay('/api/spending-insight', { 
          transactions: [
            { name: 'Restaurante', amount: 45000, date: '2023-07-05' },
            { name: 'Supermercado', amount: 120000, date: '2023-07-06' },
            { name: 'Uber', amount: 15000, date: '2023-07-07' },
            { name: 'Restaurante', amount: 35000, date: '2023-07-08' },
          ] 
        }, 1000);
        setSpendingInsight(spendingDataRes?.insight ?? null);
      } catch (error) {
        console.error('Failed to fetch AI data:', error);
      } finally {
        setIsLoadingInsight(false);
        setIsLoadingForecast(false);
        setIsLoadingSpendingInsight(false);
      }
    }
    fetchAI();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-4">
        <button onClick={onBack} className="text-arca-text-dim hover:text-arca-accent transition-colors">
          <ArrowDownLeft className="rotate-45" size={24} />
        </button>
        <h2 className="text-lg font-bold text-arca-text-primary light:text-arca-light-text-primary uppercase tracking-widest">Dashboard</h2>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="card-arca p-4 space-y-2">
          <div className="flex items-center space-x-2 text-arca-positive">
            <TrendingUp size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Ingresos</span>
          </div>
          <p className="text-lg font-bold text-arca-text-primary light:text-arca-light-text-primary">$5.5M</p>
        </div>
        <div className="card-arca p-4 space-y-2">
          <div className="flex items-center space-x-2 text-arca-alert">
            <TrendingDown size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Gastos</span>
          </div>
          <p className="text-lg font-bold text-arca-text-primary light:text-arca-light-text-primary">$4.0M</p>
        </div>
      </div>

      {/* AI Insight Section */}
      <section className="card-arca p-5 bg-arca-accent/5 border-arca-accent/20">
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles size={14} className="text-arca-accent" />
          <h3 className="text-[10px] font-bold text-arca-accent uppercase tracking-widest">Weekly Insight</h3>
        </div>
        <div className="min-h-[40px]">
          {isLoadingInsight ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-2 bg-arca-accent/10 rounded w-full" />
              <div className="h-2 bg-arca-accent/10 rounded w-2/3" />
            </div>
          ) : (
            <p className="text-xs text-arca-text-secondary leading-relaxed italic">
              {insight || "Analizando tus patrones de gasto..."}
            </p>
          )}
        </div>
      </section>

      {/* Spending Insight Section */}
      <section className="card-arca p-5 bg-arca-surface-2 border-arca-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Sparkles size={14} className="text-arca-accent" />
            <h3 className="text-[10px] font-bold text-arca-text-primary uppercase tracking-widest">Spending Insight</h3>
          </div>
          <span className="text-[8px] font-bold text-arca-text-dim uppercase tracking-widest bg-arca-surface-3 px-2 py-0.5 rounded-full">New</span>
        </div>
        <div className="min-h-[40px]">
          {isLoadingSpendingInsight ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-2 bg-arca-border rounded w-full" />
              <div className="h-2 bg-arca-border rounded w-1/2" />
            </div>
          ) : (
            <div className="flex items-start space-x-3">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-arca-accent shrink-0" />
              <p className="text-xs text-arca-text-primary leading-relaxed font-medium">
                {spendingInsight || "Identificando patrones en tus movimientos semanales..."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* AI Forecast Section */}
      <section className="card-arca p-5 bg-arca-positive/5 border-arca-positive/20">
        <div className="flex items-center space-x-2 mb-3">
          <TrendingUp size={14} className="text-arca-positive" />
          <h3 className="text-[10px] font-bold text-arca-positive uppercase tracking-widest">AI Forecast (Fin de Mes)</h3>
        </div>
        <div className="min-h-[40px]">
          {isLoadingForecast ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-2 bg-arca-positive/10 rounded w-full" />
              <div className="h-2 bg-arca-positive/10 rounded w-2/3" />
            </div>
          ) : (
            <p className="text-xs text-arca-text-secondary leading-relaxed">
              {forecast || "Proyectando tu cierre de mes..."}
            </p>
          )}
        </div>
      </section>

      <section className="card-arca p-5">
        <h3 className="text-xs font-bold text-arca-text-dim uppercase tracking-widest mb-6">Flujo de Caja Mensual</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33291B" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#7C7159', fontSize: 10, fontWeight: 'bold' }}
              />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: 'rgba(198,138,69,0.05)' }}
                contentStyle={{ 
                  backgroundColor: '#1E1811', 
                  border: '1px solid #33291B',
                  borderRadius: '12px'
                }}
              />
              <Bar dataKey="ingresos" fill="#8FA66A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" fill="#C68A45" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card-arca p-5">
        <h3 className="text-xs font-bold text-arca-text-dim uppercase tracking-widest mb-6">Net Cash Flow (6 meses)</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33291B" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#7C7159', fontSize: 10, fontWeight: 'bold' }}
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1E1811', 
                  border: '1px solid #33291B',
                  borderRadius: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="flujo" 
                stroke="#C68A45" 
                strokeWidth={3} 
                dot={{ fill: '#8FA66A', strokeWidth: 2, r: 4 }} 
                activeDot={{ r: 6, stroke: '#F3ECDC', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card-arca p-5 space-y-4">
        <h3 className="text-xs font-bold text-arca-text-dim uppercase tracking-widest">Resumen de Balance</h3>
        <div className="space-y-3">
          <BalanceItem label="Saldo Operativo" amount="$12.450.000" percentage="+12%" isPositive />
          <BalanceItem label="Deuda Total" amount="$8.200.000" percentage="-5%" />
          <BalanceItem label="Inversiones" amount="$25.000.000" percentage="+3%" isPositive />
        </div>
      </section>
    </div>
  );
}

function BalanceItem({ label, amount, percentage, isPositive }: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-arca-border last:border-0">
      <div>
        <p className="text-xs font-medium text-arca-text-secondary">{label}</p>
        <p className="text-sm font-bold text-arca-text-primary light:text-arca-light-text-primary">{amount}</p>
      </div>
      <span className={`text-[10px] font-bold ${isPositive ? 'text-arca-positive' : 'text-arca-alert'}`}>
        {percentage}
      </span>
    </div>
  );
}
