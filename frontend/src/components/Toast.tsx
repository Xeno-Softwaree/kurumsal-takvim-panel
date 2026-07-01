import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
  visible: boolean;
};

type ToastContextValue = {
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showSuccess: () => {},
  showError: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, visible: false } : t)));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
  }, []);

  const add = useCallback((type: ToastType, message: string) => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, type, message, visible: true }]);
    // begin fade-out at 3.6s, remove at 4s
    setTimeout(() => dismiss(id), 3600);
  }, [dismiss]);

  const showSuccess = useCallback((msg: string) => add('success', msg), [add]);
  const showError   = useCallback((msg: string) => add('error',   msg), [add]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              style={{ transition: 'opacity 0.35s ease, transform 0.35s ease' }}
              className={[
                'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border max-w-sm',
                t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
                t.type === 'success'
                  ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100'
                  : 'bg-red-950/95 border-red-500/40 text-red-100',
              ].join(' ')}
            >
              {t.type === 'success'
                ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
                : <XCircle    className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />}
              <p className="text-sm flex-1 leading-snug">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
                aria-label="Kapat"
              >
                <X className="h-3.5 w-3.5 opacity-60" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
