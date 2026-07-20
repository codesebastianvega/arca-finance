import React from 'react';
import { motion, AnimatePresence, type HTMLMotionProps } from 'motion/react';
import { LucideIcon } from 'lucide-react';

// --- BUTTON ---
type ButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: LucideIcon;
  fullWidth?: boolean;
  children?: React.ReactNode;
};

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  fullWidth, 
  className = '', 
  ...props 
}: ButtonProps) => {
  const variants = {
    primary: 'bg-arca-accent text-white shadow-lg shadow-arca-accent/20 hover:bg-arca-accent/90',
    secondary: 'bg-arca-surface-2 text-arca-text-primary border border-arca-border hover:bg-arca-surface-1',
    ghost: 'bg-transparent text-arca-text-dim hover:text-arca-accent hover:bg-arca-accent/5',
    danger: 'bg-arca-alert/10 text-arca-alert border border-arca-alert/20 hover:bg-arca-alert hover:text-white',
  };

  const sizes = {
    sm: 'h-8 px-3 text-[10px]',
    md: 'h-10 px-4 text-xs',
    lg: 'h-12 px-6 text-sm',
    xl: 'h-14 px-8 text-base',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={`rounded-xl font-bold uppercase tracking-widest flex items-center justify-center space-x-2 transition-all disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children && <span>{children}</span>}
    </motion.button>
  );
};

// --- CARD ---
export const Card = ({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`card-arca ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
  >
    {children}
  </div>
);

// --- BADGE ---
export const Badge = ({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: 'positive' | 'alert' | 'accent' | 'neutral' }) => {
  const variants = {
    positive: 'bg-arca-positive/10 text-arca-positive',
    alert: 'bg-arca-alert/10 text-arca-alert',
    accent: 'bg-arca-accent/10 text-arca-accent',
    neutral: 'bg-arca-surface-2 text-arca-text-dim',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${variants[variant]}`}>
      {children}
    </span>
  );
};

// --- METRIC CARD ---
export const MetricCard = ({ label, value, trend, icon: Icon, variant = 'neutral' }: { label: string; value: string; trend?: string; icon?: LucideIcon; variant?: 'positive' | 'alert' | 'neutral' }) => {
  const colors = {
    positive: 'text-arca-positive',
    alert: 'text-arca-alert',
    neutral: 'text-arca-text-primary',
  };

  return (
    <Card className="p-4 space-y-2">
      <div className={`flex items-center space-x-2 ${colors[variant]}`}>
        {Icon && <Icon size={14} />}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <p className="text-lg font-bold text-arca-text-primary">{value}</p>
        {trend && <span className={`text-[10px] font-medium ${trend.startsWith('+') ? 'text-arca-positive' : 'text-arca-alert'}`}>{trend}</span>}
      </div>
    </Card>
  );
};

// --- SECTION HEADER ---
export const SectionHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between px-1">
    <div className="space-y-0.5">
      <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">{title}</h3>
      {subtitle && <p className="text-[9px] text-arca-text-dim/60 font-medium">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// --- LOGO ---
export const Logo = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <div className={`font-black tracking-tighter text-arca-accent flex items-center space-x-2 ${className}`} style={{ fontSize: size }}>
    <span>ARCA</span>
    <div className="w-1.5 h-1.5 rounded-full bg-arca-accent mt-1" />
  </div>
);

// --- EMPTY STATE ---
export const EmptyState = ({ title, message, icon: Icon, action }: { title: string; message: string; icon: LucideIcon; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
    <div className="w-16 h-16 rounded-full bg-arca-surface-2 flex items-center justify-center text-arca-text-dim">
      <Icon size={32} />
    </div>
    <div className="space-y-1">
      <h3 className="text-sm font-bold text-arca-text-primary uppercase tracking-widest">{title}</h3>
      <p className="text-xs text-arca-text-dim max-w-[240px]">{message}</p>
    </div>
    {action && <div className="pt-2">{action}</div>}
  </div>
);

// --- CONFIRM DIALOG ---
export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  summaryData?: Array<{ label: string; value: React.ReactNode }>;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
}

export const ConfirmDialog = ({
  isOpen,
  title,
  description,
  summaryData,
  onCancel,
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'primary'
}: ConfirmDialogProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="confirm-dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onCancel}
        >
          <motion.div
            key="confirm-dialog-modal"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="w-full max-w-sm overflow-hidden rounded-3xl border border-arca-border bg-arca-bg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-arca-text-primary">{title}</h3>
            {description && <p className="mt-2 text-xs text-arca-text-dim">{description}</p>}
            
            {summaryData && summaryData.length > 0 && (
              <div className="mt-4 rounded-xl border border-arca-border bg-arca-surface-1 p-3 divide-y divide-arca-border">
                {summaryData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 first:pt-0 last:pb-0 gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-arca-text-dim">{item.label}</span>
                    <span className="text-xs font-bold text-arca-text-primary text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 flex gap-2">
              <Button variant="secondary" size="md" fullWidth onClick={onCancel}>
                {cancelText}
              </Button>
              <Button variant={confirmVariant} size="md" fullWidth onClick={onConfirm}>
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

