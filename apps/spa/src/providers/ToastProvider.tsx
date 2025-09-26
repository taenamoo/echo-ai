import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info' | 'warning';
type Toast = { id: string; message: string; type: ToastKind; duration?: number };

type ToastContextValue = {
  push: (t: Omit<Toast, 'id'> | string, type?: ToastKind, durationOverride?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children, defaultDuration = 3000, position = 'top-right' }: { children: React.ReactNode; defaultDuration?: number; position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'> | string, type: ToastKind = 'info', durationOverride?: number) => {
    const base: Omit<Toast, 'id'> = typeof t === 'string' ? { message: t, type } : { message: t.message, type: t.type ?? type, duration: t.duration };
    const toast: Toast = { id: crypto.randomUUID(), ...base };
    setToasts((prev) => [...prev, toast]);
    const ttl = durationOverride ?? toast.duration ?? defaultDuration;
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== toast.id)), Math.max(500, ttl));
  }, [defaultDuration]);

  const value = useMemo(() => ({ push }), [push]);
  const posClass = position === 'top-right' ? 'top-4 right-4' : position === 'top-left' ? 'top-4 left-4' : position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4';

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic className={`fixed ${posClass} z-50 space-y-2`}>
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`px-4 py-2 rounded shadow text-sm text-white ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : t.type === 'warning' ? 'bg-yellow-600' : 'bg-gray-800'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

