import { 
  Home, 
  Wallet, 
  ReceiptText, 
  Menu,
  LayoutDashboard, 
  Target, 
  TrendingUp, 
  Calendar, 
  Briefcase, 
  History, 
  Send, 
  Settings,
  ShieldAlert,
  CreditCard,
  PiggyBank,
  Repeat
} from 'lucide-react';
import { Screen } from '../../types';

export interface NavItem {
  id: Screen;
  label: string;
  icon: any;
  category: 'primary' | 'secondary' | 'system' | 'hidden';
}

export const NAV_ITEMS: NavItem[] = [
  // Primary (Bottom Tab Bar)
  { id: 'hoy', label: 'Hoy', icon: Home, category: 'primary' },
  { id: 'dinero_cuentas', label: 'Dinero', icon: Wallet, category: 'primary' },
  { id: 'calendario', label: 'Agenda', icon: Calendar, category: 'primary' },
  { id: 'mas', label: 'Menú', icon: Menu, category: 'primary' },

  // Secondary (Mas Menu)
  { id: 'dashboard', label: 'Historial financiero', icon: LayoutDashboard, category: 'secondary' },
  { id: 'planeacion_mes', label: 'Plan del mes', icon: Target, category: 'secondary' },
  { id: 'planeacion_proyeccion', label: 'Proyección Futura', icon: TrendingUp, category: 'secondary' },
  { id: 'obligaciones', label: 'Pagos y deudas', icon: ReceiptText, category: 'secondary' },
  { id: 'negocios', label: 'Negocios', icon: Briefcase, category: 'secondary' },
  { id: 'movimientos', label: 'Movimientos', icon: History, category: 'secondary' },
  { id: 'transferir', label: 'Transferir', icon: Send, category: 'secondary' },
  { id: 'suscripciones', label: 'Suscripciones', icon: Repeat, category: 'secondary' },
  
  // Money Sub-screens
  { id: 'dinero_tarjetas', label: 'Tarjetas', icon: CreditCard, category: 'hidden' },
  { id: 'dinero_ahorro', label: 'Ahorro', icon: PiggyBank, category: 'hidden' },

  // System
  { id: 'configuracion', label: 'Configuración', icon: Settings, category: 'system' },
  { id: 'superadmin', label: 'SuperAdmin', icon: ShieldAlert, category: 'system' },
  { id: 'registrar', label: 'Registrar', icon: Send, category: 'hidden' },
];

export const getNavItem = (id: Screen) => NAV_ITEMS.find(item => item.id === id);
