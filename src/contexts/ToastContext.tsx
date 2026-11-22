import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-20 sm:bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2.5 pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.94 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'pointer-events-auto glass-card-strong flex items-start gap-3 rounded-2xl p-4 shadow-glass-lg transition-colors duration-200',
                t.variant === 'error' && 'border-[#E9E5E8] bg-[#F7F3EF]/95',
                t.variant === 'success' && 'border-[#E9E5E8] bg-white/95',
                t.variant === 'info' && 'border-white/90 bg-white/90'
              )}
            >
              {t.variant === 'success' && (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#C9182B]" />
              )}
              {t.variant === 'error' && (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#B51224]" />
              )}
              {t.variant === 'info' && (
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#C9182B]" />
              )}
              <div className="flex-1 text-sm">
                <p className="font-semibold text-[#29262B]">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs text-[#777078]">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-lg p-1 text-[#777078] hover:bg-[#F8E7EA] hover:text-[#C9182B] transition-transform duration-150 active:scale-90"
                aria-label="Isara ang abiso"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
