import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowDownLeft, 
  User, 
  Shield, 
  Bell, 
  Moon, 
  Smartphone, 
  HelpCircle, 
  Lock, 
  Unlock, 
  Fingerprint, 
  Sun,
  LayoutGrid,
  Plus,
  Utensils,
  Car,
  Home,
  Gamepad2,
  HeartPulse,
  Zap,
  MoreHorizontal
} from 'lucide-react';
import { haptics } from '../lib/haptics';

const INITIAL_CATEGORIES = [
  { id: 'hogar', label: 'Hogar', icon: Home, type: 'expense' },
  { id: 'comida', label: 'Comida', icon: Utensils, type: 'expense' },
  { id: 'transporte', label: 'Transporte', icon: Car, type: 'expense' },
  { id: 'ocio', label: 'Ocio', icon: Gamepad2, type: 'expense' },
  { id: 'salud', label: 'Salud', icon: HeartPulse, type: 'expense' },
  { id: 'servicios', label: 'Servicios', icon: Zap, type: 'expense' },
];

export default function ConfiguracionScreen({ onBack, isDarkMode, setIsDarkMode }: { onBack: () => void; isDarkMode: boolean; setIsDarkMode: (val: boolean) => void }) {
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(true);
  const [isAnimatingLock, setIsAnimatingLock] = useState(false);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);

  const toggleBiometric = () => {
    haptics.medium();
    setIsAnimatingLock(true);
    setIsBiometricEnabled(!isBiometricEnabled);
    setTimeout(() => setIsAnimatingLock(false), 1500);
  };

  const deleteCategory = (id: string) => {
    haptics.error();
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6 relative overflow-hidden">
      <AnimatePresence>
        {isAnimatingLock && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.5, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-32 h-32 rounded-3xl bg-arca-accent flex items-center justify-center shadow-2xl shadow-arca-accent/40"
            >
              {isBiometricEnabled ? (
                <Lock size={48} className="text-white" />
              ) : (
                <Unlock size={48} className="text-white" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="flex items-center space-x-4">
        <button onClick={onBack} className="text-arca-text-dim hover:text-arca-accent transition-colors">
          <ArrowDownLeft className="rotate-45" size={24} />
        </button>
        <h2 className="text-lg font-bold text-arca-text-primary light:text-arca-light-text-primary uppercase tracking-widest">Configuración</h2>
      </header>

      <section className="flex flex-col items-center py-6 space-y-3">
        <div className="w-24 h-24 rounded-full border-2 border-arca-accent p-1">
          <div className="w-full h-full rounded-full bg-arca-surface-2 overflow-hidden">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sebastian" alt="Profile" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-arca-text-primary light:text-arca-light-text-primary">Sebastián Vega</h3>
          <p className="text-xs text-arca-text-dim">sebas@arca.co • Miembro Premium</p>
        </div>
      </section>

      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest px-1">Cuenta y Seguridad</h3>
          <div className="card-arca divide-y divide-arca-border overflow-hidden">
            <ConfigRow icon={User} label="Perfil Personal" />
            <button 
              onClick={toggleBiometric}
              className="w-full flex items-center justify-between p-4 bg-arca-surface-1 hover:bg-arca-surface-2 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 rounded-lg bg-arca-surface-2 flex items-center justify-center text-arca-text-secondary">
                  <Fingerprint size={18} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-semibold text-arca-text-primary">Biometría FaceID</span>
                  <span className="block text-[9px] text-arca-text-dim font-bold uppercase tracking-tighter">Protección al abrir app</span>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isBiometricEnabled ? 'bg-arca-accent' : 'bg-arca-surface-2 border border-arca-border'}`}>
                <motion.div 
                  animate={{ x: isBiometricEnabled ? 24 : 0 }}
                  className="w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </div>
            </button>
            <ConfigRow icon={Smartphone} label="Dispositivos" value="2" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Gestión de Categorías</h3>
            <button 
              onClick={() => haptics.light()}
              className="text-[9px] font-bold text-arca-accent uppercase tracking-widest flex items-center"
            >
              <Plus size={10} className="mr-1" /> Nuevo
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <motion.div
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                className="card-arca p-3 flex flex-col items-center justify-center space-y-2 relative group"
              >
                <div className="w-10 h-10 rounded-xl bg-arca-surface-2 flex items-center justify-center text-arca-text-primary">
                  <cat.icon size={20} />
                </div>
                <span className="text-[10px] font-bold text-arca-text-primary text-center truncate w-full">{cat.label}</span>
                
                <button 
                  onClick={() => deleteCategory(cat.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-arca-alert text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <Plus size={12} className="rotate-45" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest px-1">Preferencias</h3>
          <div className="card-arca divide-y divide-arca-border overflow-hidden">
            <ConfigRow icon={Bell} label="Notificaciones" />
            
            <button 
              onClick={() => { haptics.medium(); setIsDarkMode(!isDarkMode); }}
              className="w-full flex items-center justify-between p-4 bg-arca-surface-1 hover:bg-arca-surface-2 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 rounded-lg bg-arca-surface-2 flex items-center justify-center text-arca-text-secondary">
                  {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                </div>
                <div className="text-left">
                  <span className="block text-sm font-semibold text-arca-text-primary">Tema Visual</span>
                  <span className="block text-[9px] text-arca-text-dim font-bold uppercase tracking-tighter">Modo {isDarkMode ? 'Oscuro' : 'Claro'}</span>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-arca-accent' : 'bg-arca-surface-2 border border-arca-border'}`}>
                <motion.div 
                  animate={{ x: isDarkMode ? 24 : 0 }}
                  className="w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </div>
            </button>

            <ConfigRow icon={HelpCircle} label="Centro de Ayuda" />
          </div>
        </div>

        <div className="py-4 text-center">
          <p className="text-[9px] font-bold text-arca-text-dim uppercase tracking-widest">Arca Finanzas v2.4.0 (Build 120)</p>
          <p className="text-[8px] text-arca-text-dim mt-1">Made with premium wood and copper.</p>
        </div>
      </div>
    </div>
  );
}

function ConfigRow({ icon: Icon, label, value }: any) {
  return (
    <motion.button 
      whileTap={{ scale: 0.985 }}
      className="w-full flex items-center justify-between p-4 bg-arca-surface-1"
    >
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 rounded-lg bg-arca-surface-2 flex items-center justify-center text-arca-text-secondary">
          <Icon size={18} />
        </div>
        <span className="text-sm font-semibold text-arca-text-primary light:text-arca-light-text-primary">{label}</span>
      </div>
      <div className="flex items-center space-x-2">
        {value && <span className="text-[10px] font-bold text-arca-accent uppercase tracking-wider">{value}</span>}
        <ArrowDownLeft size={16} className="text-arca-text-dim -rotate-135" />
      </div>
    </motion.button>
  );
}
