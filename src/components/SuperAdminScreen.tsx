import { motion } from 'motion/react';
import { ShieldAlert, Database, Cpu, Activity, ArrowDownLeft } from 'lucide-react';

export default function SuperAdminScreen({ onBack }: { onBack: () => void }) {
  const stats = [
    { label: 'Uptime', value: '99.98%', icon: Activity },
    { label: 'DB Latency', value: '12ms', icon: Database },
    { label: 'Server Load', value: '14%', icon: Cpu },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-4">
        <button onClick={onBack} className="text-arca-text-dim hover:text-arca-accent transition-colors">
          <ArrowDownLeft className="rotate-45" size={24} />
        </button>
        <div className="flex items-center space-x-2">
          <ShieldAlert className="text-arca-alert" size={20} />
          <h2 className="text-lg font-bold text-arca-text-primary uppercase tracking-widest">SuperAdmin</h2>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className="card-arca p-3 space-y-2">
            <stat.icon size={14} className="text-arca-text-dim" />
            <p className="text-[8px] font-bold text-arca-text-dim uppercase tracking-tighter">{stat.label}</p>
            <p className="text-xs font-bold text-arca-text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="card-arca p-5 space-y-4">
        <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Registros de Sistema</h3>
        <div className="space-y-2 font-mono text-[9px] text-arca-text-secondary">
          <p className="opacity-50">[2026-07-10 11:32:01] INFO: Health check passed</p>
          <p className="opacity-50">[2026-07-10 11:31:45] WARN: API latency spike (45ms)</p>
          <p className="opacity-50">[2026-07-10 11:30:12] INFO: Deployment v2.4.5 active</p>
          <p className="text-arca-accent">[2026-07-10 11:29:05] AUTH: New superadmin login session</p>
        </div>
      </section>

      <div className="space-y-3">
        <button className="w-full h-12 bg-arca-alert/10 border border-arca-alert/20 text-arca-alert rounded-xl font-bold text-[10px] uppercase tracking-widest">
          Reiniciar Instancia de Datos
        </button>
        <button className="w-full h-12 bg-arca-surface-2 border border-arca-border text-arca-text-dim rounded-xl font-bold text-[10px] uppercase tracking-widest">
          Descargar Volcado SQL (.sql)
        </button>
      </div>
    </div>
  );
}
