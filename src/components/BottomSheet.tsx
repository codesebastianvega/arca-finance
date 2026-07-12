import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 transition-opacity"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col h-[86dvh] max-h-[86dvh] min-h-0 overflow-hidden
                       bg-arca-surface-1 light:bg-arca-light-surface-1
                       rounded-t-[32px] border-t border-arca-border-strong light:border-white/50
                       shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
          >
            {/* Drag Handle & Header */}
            <div className="sticky top-0 z-10 pt-4 pb-2 px-6 flex shrink-0 flex-col space-y-4 bg-arca-surface-1 light:bg-arca-light-surface-1">
              <div className="flex justify-center">
                <div className="w-10 h-1 rounded-full bg-arca-text-dim/30" />
              </div>
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-widest text-arca-text-primary">
                  {title ?? "Cerrar"}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 -mr-2 text-arca-text-dim hover:text-arca-text-primary transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {/* Content Container */}
            <div
              className="flex-1 min-h-0 overflow-y-scroll overscroll-contain px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {children}
            </div>

            <div className="sticky bottom-0 z-10 shrink-0 border-t border-arca-border px-6 py-3 bg-arca-surface-1 light:bg-arca-light-surface-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-arca-border bg-arca-surface-2 px-4 py-3 text-sm font-semibold text-arca-text-primary"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
