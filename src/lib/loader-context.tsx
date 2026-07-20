'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

type NotificationType = 'success' | 'error';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface LoaderContextType {
  showLoader: (message?: string) => void;
  hideLoader: () => void;
  notify: (message: string, type: NotificationType) => void;
}

const LoaderContext = createContext<LoaderContextType | null>(null);

export function useLoader() {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
}

const ArcaVaultSpinner = () => (
  <svg 
    className="w-16 h-16 animate-spin text-arca-accent" 
    viewBox="0 0 1024 1024" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ animationDuration: '3s' }}
  >
    <path 
      d="M 350,760 Q 300,520 512,300 Q 724,520 674,760" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="98" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <circle cx="512" cy="566" r="56" fill="currentColor" />
  </svg>
);

export function LoaderProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showLoader = useCallback((message?: string) => {
    setLoadingMessage(message);
    setIsLoading(true);
  }, []);

  const hideLoader = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage(undefined);
  }, []);

  const notify = useCallback((message: string, type: NotificationType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader, notify }}>
      {children}

      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="global-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative flex items-center justify-center">
                <ArcaVaultSpinner />
              </div>
              {loadingMessage && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="text-xs font-bold uppercase tracking-widest text-arca-accent"
                >
                  {loadingMessage}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-[calc(2rem+env(safe-area-inset-bottom))] left-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`flex items-center gap-3 rounded-2xl p-4 shadow-lg pointer-events-auto backdrop-blur-md ${
                notification.type === 'success' 
                  ? 'bg-arca-success/20 border border-arca-success/30 text-arca-success' 
                  : 'bg-arca-alert/20 border border-arca-alert/30 text-arca-alert'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <p className="flex-1 text-xs font-bold text-arca-text-primary leading-tight">
                {notification.message}
              </p>
              <button 
                onClick={() => dismissNotification(notification.id)}
                className="p-1 rounded-full hover:bg-black/10 transition-colors"
                aria-label="Cerrar notificación"
              >
                <X size={16} className={notification.type === 'success' ? 'text-arca-success' : 'text-arca-alert'} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </LoaderContext.Provider>
  );
}
