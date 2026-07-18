import { motion } from 'motion/react';
import { Plus, type LucideIcon } from 'lucide-react';
import { Screen } from '../types';
import { haptics } from '../lib/haptics';
import { NAV_ITEMS } from '../features/app-shell/nav';

interface BottomTabNavigationProps {
  currentScreen: Screen;
  onScreenChange: (screen: Screen) => void;
  onAddClick: () => void;
}

export default function BottomTabNavigation({ 
  currentScreen, 
  onScreenChange, 
  onAddClick 
}: BottomTabNavigationProps) {
  
  const navItems = NAV_ITEMS.filter((item) => item.category === 'primary');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-arca-surface-1 light:bg-arca-light-surface-1 border-t border-arca-border light:border-arca-light-border pb-safe">
      <div className="flex items-center justify-around h-16 px-2 relative">
        {/* Left items */}
        {navItems.slice(0, 2).map((item) => (
          <TabItem 
            key={item.id} 
            item={item} 
            isActive={currentScreen === item.id || (item.id === 'hoy' && currentScreen === 'resumen') || (item.id === 'dinero_cuentas' && currentScreen.startsWith('dinero_'))}
            onClick={() => onScreenChange(item.id)} 
          />
        ))}

        {/* Elevated FAB Placeholder space */}
        <div className="w-14 h-14" />

        {/* Right items */}
        {navItems.slice(2).map((item) => {
          const isMasActive = item.id === 'mas' && ![
            'hoy', 'dinero_cuentas', 'dinero_tarjetas', 'dinero_ahorro', 'calendario'
          ].includes(currentScreen);

          return (
            <TabItem 
              key={item.id} 
              item={item} 
              isActive={currentScreen === item.id || isMasActive} 
              onClick={() => onScreenChange(item.id)} 
            />
          );
        })}

        {/* The Elevated FAB */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            haptics.medium();
            onAddClick();
          }}
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full
                     bg-gradient-to-br from-arca-accent to-arca-accent-hover 
                     shadow-[0_8px_20px_-6px_rgba(198,138,69,0.5)]
                     flex items-center justify-center border border-arca-border-strong border-t-arca-text-primary border-t-opacity-20"
        >
          <Plus className="text-arca-base w-7 h-7" strokeWidth={4} />
        </motion.button>
      </div>
    </div>
  );
}

function TabItem({ item, isActive, onClick }: { item: { id: Screen; label: string; icon: LucideIcon }; isActive: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button 
      type="button"
      aria-label={`Ir a ${item.label}`}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => {
        haptics.light();
        onClick();
      }}
      className="flex flex-col items-center justify-center flex-1 space-y-1"
    >
      <Icon
        size={22} 
        className={isActive 
          ? "text-arca-accent light:text-arca-light-accent" 
          : "text-arca-text-dim"} 
      />
      <span className={`text-[10px] font-medium ${isActive 
        ? "text-arca-accent light:text-arca-light-accent" 
        : "text-arca-text-dim"}`}>
        {item.label}
      </span>
    </button>
  );
}
