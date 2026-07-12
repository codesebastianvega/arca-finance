import { motion } from 'motion/react';
import { ChevronRight, LogOut } from 'lucide-react';
import { Screen } from '../types';
import { haptics } from '../lib/haptics';
import { NAV_ITEMS } from '../features/app-shell/nav';

interface MasScreenProps {
  onScreenChange: (screen: Screen) => void;
  totalBalance: number;
}

function money(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s?COP$/, '')
    .trim();
}

export default function MasScreen({ onScreenChange, totalBalance }: MasScreenProps) {
  const handleMenuClick = (screen: Screen) => {
    haptics.medium();
    onScreenChange(screen);
  };

  const menuItems = NAV_ITEMS.filter((item) => item.category === 'secondary' || item.category === 'system');

  return (
    <div className="space-y-6 relative">
      <section className="card-arca p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Resumen general</h3>
          <div className="rounded-full bg-arca-accent/10 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-arca-accent">
            COP
          </div>
        </div>
        <div className="flex justify-between items-baseline gap-4">
          <p className="text-xs text-arca-text-dim">Balance total visible</p>
          <div className="text-right">
            <p className="text-lg font-bold text-arca-text-primary light:text-arca-light-text-primary">{money(totalBalance)}</p>
            <p className="text-[9px] text-arca-text-dim uppercase tracking-tighter">Lo que ya tienes en cuentas reales</p>
          </div>
        </div>
      </section>

      <div className="card-arca overflow-hidden divide-y divide-arca-border light:divide-arca-light-border">
        {menuItems.map((item, i) => (
          <MenuRow key={i} icon={item.icon} label={item.label} onClick={() => handleMenuClick(item.id)} />
        ))}
      </div>

      <div className="card-arca overflow-hidden divide-y divide-arca-border light:divide-arca-light-border">
        <MenuRow icon={LogOut} label="Salir" isDanger onClick={() => window.location.assign('/auth/sign-out')} />
      </div>
    </div>
  );
}

function MenuRow({ icon: Icon, label, isDanger, isHighlight, onClick }: any) {
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={onClick} className="w-full flex items-center justify-between px-5 py-4">
      <div className="flex items-center space-x-4">
        <Icon size={20} className={isDanger ? 'text-arca-alert' : isHighlight ? 'text-arca-accent' : 'text-arca-text-secondary light:text-arca-light-text-secondary'} />
        <span className={`text-sm font-semibold ${isDanger ? 'text-arca-alert' : 'text-arca-text-primary light:text-arca-light-text-primary'}`}>
          {label}
        </span>
      </div>
      {!isDanger && <ChevronRight size={18} className="text-arca-text-dim" />}
    </motion.button>
  );
}
