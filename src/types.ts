export type Screen = 
  | 'hoy' 
  | 'dashboard' 
  | 'dinero_cuentas' 
  | 'dinero_tarjetas' 
  | 'dinero_ahorro' 
  | 'obligaciones' 
  | 'calendario' 
  | 'planeacion_mes' 
  | 'planeacion_proyeccion' 
  | 'negocios' 
  | 'movimientos' 
  | 'configuracion' 
  | 'registrar' 
  | 'transferir' 
  | 'mas' 
  | 'superadmin';

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  status: 'pending' | 'paid' | 'overdue' | 'positive' | 'today';
  category: string;
  notes?: string;
  tags?: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string; // lucide icon name
  color?: string;
  type: 'expense' | 'income';
}

export interface Account {
  id: string;
  name: string;
  bankId: string;
  type: 'Ahorros' | 'Corriente' | 'Bolsillo' | 'Digital';
  balance: number;
  currency: 'COP' | 'USD';
  color?: string;
}

export interface Obligation {
  id: string;
  name: string;
  entity: string;
  totalAmount: number;
  interestRate: number;
  installmentsTotal: number;
  installmentsPaid: number;
  dueDate: string;
  status: 'active' | 'completed' | 'overdue' | 'today';
  category: string;
  suggestedSource?: string;
}

export interface Loan {
  id: string;
  debtor: string;
  amount: number;
  date: string;
  expectedReturnDate: string;
  status: 'pending' | 'recovered' | 'overdue';
  notes?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  bankId: string;
  used: number;
  limit: number;
  dueDate: string;
  closingDate: string;
}
