import { 
  Home, 
  Wallet, 
  ReceiptText, 
  MoreHorizontal, 
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
  { id: 'obligaciones', label: 'Obligaciones', icon: ReceiptText, category: 'primary' },
  { id: 'mas', label: 'Más', icon: MoreHorizontal, category: 'primary' },

  // Secondary (Mas Menu)
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'secondary' },
  { id: 'planeacion_mes', label: 'Planeación Mes', icon: Target, category: 'secondary' },
  { id: 'planeacion_proyeccion', label: 'Proyección Futura', icon: TrendingUp, category: 'secondary' },
  { id: 'calendario', label: 'Calendario', icon: Calendar, category: 'secondary' },
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
