import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  User, 
  Fingerprint, 
  Smartphone, 
  Bell, 
  HelpCircle, 
  Lock, 
  Unlock, 
  Plus,
  Utensils,
  Car,
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
} from 'lucide-react';
import { haptics } from '../lib/haptics';
import type { ThemeId } from '../App';

const INITIAL_CATEGORIES = [
  { id: 'hogar', label: 'Hogar', icon: Home, type: 'expense' },
  { id: 'comida', label: 'Comida', icon: Utensils, type: 'expense' },
  { id: 'transporte', label: 'Transporte', icon: Car, type: 'expense' },
  { id: 'ocio', label: 'Ocio', icon: Gamepad2, type: 'expense' },
  { id: 'salud', label: 'Salud', icon: HeartPulse, type: 'expense' },
  { id: 'servicios', label: 'Servicios', icon: Zap, type: 'expense' },
];

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

export default function ConfiguracionScreen({ onBack, theme, setTheme }: { onBack: () => void; theme: ThemeId; setTheme: (t: ThemeId) => void }) {
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

  const currentTheme = THEMES.find(t => t.id === theme)!;

  return (
    <div className="space-y-8 relative overflow-hidden pb-6">
      {/* Lock animation overlay */}
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

      {/* Header */}
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-arca-surface-2 flex items-center justify-center text-arca-text-dim hover:text-arca-accent transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-arca-text-primary uppercase tracking-widest">Configuración</h2>
          <p className="text-[10px] text-arca-text-dim font-bold uppercase tracking-wider">Personaliza tu experiencia</p>
        </div>
      </header>

      {/* Profile Card */}
      <section className="relative overflow-hidden rounded-3xl border border-arca-border p-6"
        style={{ background: `linear-gradient(135deg, ${currentTheme.accent}15 0%, transparent 60%)` }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-[50px] opacity-30" style={{ backgroundColor: currentTheme.accent }} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl border-2 border-arca-accent/30 p-0.5 shrink-0">
            <div className="w-full h-full rounded-[14px] bg-arca-surface-2 overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sebastian" alt="Profile" className="w-full h-full" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-arca-text-primary truncate">Sebastián Vega</h3>
            <p className="text-[11px] text-arca-text-dim font-medium">sebas@arca.co</p>
            <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-arca-accent/15 text-arca-accent">
              <Sparkles size={10} /> Miembro Premium
            </span>
          </div>
        </div>
      </section>

      {/* ── Theme Picker ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Palette size={14} className="text-arca-accent" />
          <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Tema Visual</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {THEMES.map((t) => {
            const isActive = t.id === theme;
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => { haptics.medium(); setTheme(t.id); }}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  isActive 
                    ? 'border-arca-accent shadow-lg' 
                    : 'border-arca-border hover:border-arca-border-strong'
                }`}
                style={isActive ? { boxShadow: `0 4px 20px -4px ${t.accent}50` } : {}}
              >
                {/* Mini preview */}
                <div className="w-full aspect-[3/4] rounded-lg overflow-hidden relative" style={{ backgroundColor: t.colors[0] }}>
                  {/* Fake UI bars */}
                  <div className="absolute top-1.5 left-1.5 right-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.colors[1] }} />
                  <div className="absolute top-4 left-1.5 w-3/5 h-1 rounded-full" style={{ backgroundColor: t.colors[3], opacity: 0.4 }} />
                  <div className="absolute bottom-3 left-1.5 right-1.5 h-2.5 rounded" style={{ backgroundColor: t.colors[2], opacity: 0.6 }} />
                  <div className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded" style={{ backgroundColor: t.colors[1] }} />
                  {/* Glow */}
                  <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full blur-[8px] opacity-50" style={{ backgroundColor: t.colors[2] }} />
                </div>
                <span className="text-[10px] font-bold text-arca-text-primary">{t.name}</span>
                
                {/* Check badge */}
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

      {/* ── Account & Security ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck size={14} className="text-arca-accent" />
          <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Cuenta y Seguridad</h3>
        </div>
        <div className="rounded-2xl border border-arca-border overflow-hidden divide-y divide-arca-border">
          <ConfigRow icon={User} label="Perfil Personal" />
          
          {/* Biometric toggle */}
          <button 
            onClick={toggleBiometric}
            className="w-full flex items-center justify-between p-4 bg-arca-surface-1 hover:bg-arca-surface-2 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-arca-surface-2 flex items-center justify-center text-arca-text-secondary">
                <Fingerprint size={18} />
              </div>
              <div className="text-left">
                <span className="block text-sm font-semibold text-arca-text-primary">Biometría FaceID</span>
                <span className="block text-[9px] text-arca-text-dim font-bold uppercase tracking-wider">Protección al abrir</span>
              </div>
            </div>
            <div className={`w-12 h-7 rounded-full p-1 transition-colors ${isBiometricEnabled ? 'bg-arca-accent' : 'bg-arca-surface-2 border border-arca-border'}`}>
              <motion.div 
                animate={{ x: isBiometricEnabled ? 20 : 0 }}
                className="w-5 h-5 bg-white rounded-full shadow-md"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </button>

          <ConfigRow icon={Smartphone} label="Dispositivos" value="2" />
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-arca-accent" />
            <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Categorías</h3>
          </div>
          <button 
            onClick={() => haptics.light()}
            className="text-[9px] font-bold text-arca-accent uppercase tracking-widest flex items-center gap-1 hover:text-arca-accent-hover transition-colors"
          >
            <Plus size={10} /> Nuevo
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => (
            <motion.div
              key={cat.id}
              whileTap={{ scale: 0.95 }}
              className="relative group p-3 rounded-2xl bg-arca-surface-1 border border-arca-border hover:border-arca-border-strong transition-colors flex flex-col items-center justify-center gap-2"
            >
              <div className="w-10 h-10 rounded-xl bg-arca-surface-2 flex items-center justify-center text-arca-text-secondary">
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
      </section>

      {/* ── Preferences ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Bell size={14} className="text-arca-accent" />
          <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Preferencias</h3>
        </div>
        <div className="rounded-2xl border border-arca-border overflow-hidden divide-y divide-arca-border">
          <ConfigRow icon={Bell} label="Notificaciones" />
          <ConfigRow icon={HelpCircle} label="Centro de Ayuda" />
        </div>
      </section>

      {/* Footer */}
      <div className="py-4 text-center space-y-1">
        <p className="text-[9px] font-bold text-arca-text-dim uppercase tracking-widest">Arca Finanzas v2.4.0 (Build 120)</p>
        <p className="text-[8px] text-arca-text-dim">Hecho con bronce y código.</p>
      </div>
    </div>
  );
}

function ConfigRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number }>; label: string; value?: string }) {
  return (
    <motion.button 
      whileTap={{ scale: 0.985 }}
      className="w-full flex items-center justify-between p-4 bg-arca-surface-1 hover:bg-arca-surface-2 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-arca-surface-2 flex items-center justify-center text-arca-text-secondary">
          <Icon size={18} />
        </div>
        <span className="text-sm font-semibold text-arca-text-primary">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-[10px] font-bold text-arca-accent uppercase tracking-wider">{value}</span>}
        <ChevronRight size={16} className="text-arca-text-dim" />
      </div>
    </motion.button>
  );
}
