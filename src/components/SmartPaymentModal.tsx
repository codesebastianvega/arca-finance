import { motion, AnimatePresence } from 'motion/react';
import { X, Wallet, CreditCard, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { haptics } from '../lib/haptics';

interface SmartPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
  accounts: any[];
  onConfirm: (split: any) => void;
}

export default function SmartPaymentModal({ isOpen, onClose, payment, accounts, onConfirm }: SmartPaymentModalProps) {
  if (!payment) return null;

  const parseAmount = (value: string | number | null | undefined) => {
    if (typeof value === 'number') return value;
    return Number(String(value ?? '').replace(/[^\d-]/g, '')) || 0;
  };

  const totalAmount = parseAmount(payment.amount);
  const sortableAccounts = [...accounts].sort((a, b) => parseAmount(b.balance) - parseAmount(a.balance));
  const primaryAccount = sortableAccounts[0];

  if (!primaryAccount) return null;

  const primaryBalance = parseAmount(primaryAccount.balance);
  
  const deficit = totalAmount - primaryBalance;
  const isInsufficient = deficit > 0;
  
  const secondaryAccount = sortableAccounts.find(acc => acc.id !== primaryAccount.id && parseAmount(acc.balance) >= deficit);
  const canCoverPayment = !isInsufficient || Boolean(secondaryAccount);

  const handlePay = () => {
    haptics.success();
    onConfirm({
      primary: { id: primaryAccount.id, amount: isInsufficient ? primaryBalance : totalAmount },
      secondary: isInsufficient && secondaryAccount ? { id: secondaryAccount.id, amount: deficit } : null
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[600] flex items-end justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-arca-surface-1 rounded-t-[40px] p-8 space-y-8 pb-12 shadow-2xl border-t border-arca-border"
          >
            <div className="w-12 h-1.5 bg-arca-border rounded-full mx-auto" />
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold text-arca-text-primary tracking-tight">Pagar {payment.name}</h3>
                <p className="text-xs font-bold text-arca-text-dim uppercase tracking-widest mt-1">{payment.category}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-arca-text-primary">${payment.amount}</p>
                <p className="text-[10px] font-bold text-arca-alert uppercase tracking-widest">Pendiente</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`p-5 rounded-3xl border transition-all ${isInsufficient ? 'bg-arca-alert/5 border-arca-alert/20' : 'bg-arca-surface-2 border-arca-border'}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <Wallet size={16} className={isInsufficient ? 'text-arca-alert' : 'text-arca-accent'} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-secondary">Cuenta Principal: {primaryAccount.name}</span>
                  </div>
                  <span className="text-xs font-bold text-arca-text-primary">{primaryAccount.balance}</span>
                </div>
                
                {isInsufficient && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-3 border-t border-arca-alert/10 space-y-3"
                  >
                    <div className="flex items-center space-x-2 text-arca-alert">
                      <Sparkles size={14} />
                      <p className="text-[10px] font-bold uppercase tracking-tight">Saldo insuficiente. Faltan ${deficit.toLocaleString()}</p>
                    </div>
                    
                    {secondaryAccount ? (
                      <div className="bg-arca-surface-1 p-3 rounded-2xl border border-arca-border flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-arca-accent/10 flex items-center justify-center text-arca-accent">
                            <CreditCard size={14} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-arca-text-primary uppercase tracking-widest">{secondaryAccount.name}</p>
                            <p className="text-[9px] text-arca-text-dim uppercase tracking-wider">Sugerido para cubrir excedente</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-arca-text-primary">Usar ${deficit.toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="bg-arca-surface-1 p-3 rounded-2xl border border-arca-alert/20 text-arca-alert text-[10px] font-bold uppercase tracking-wider">
                        No hay otra cuenta con saldo suficiente para completar este pago.
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={onClose}
                className="h-16 rounded-2xl bg-arca-surface-2 border border-arca-border font-bold uppercase tracking-widest text-[10px] text-arca-text-dim active:scale-95 transition-transform"
              >
                Cancelar
              </button>
              <button 
                onClick={handlePay}
                disabled={!canCoverPayment}
                className="h-16 rounded-2xl bg-arca-accent text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-arca-accent/20 flex items-center justify-center space-x-2 active:scale-95 transition-transform"
              >
                <span>Confirmar Pago</span>
                <CheckCircle2 size={16} />
              </button>
            </div>

            <p className="text-[9px] text-arca-text-dim text-center uppercase tracking-widest opacity-60">
              Se generarán {isInsufficient ? '2' : '1'} transacciones automáticas
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
