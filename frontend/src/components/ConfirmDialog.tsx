import { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

type ConfirmOptions = {
  title?: string;
  variant?: 'danger' | 'default';
  confirmLabel?: string;
};

type PendingConfirm = {
  message: string;
  options: ConfirmOptions & { variant: 'danger' | 'default' };
  resolve: (result: boolean) => void;
};

type ConfirmContextValue = {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: () => Promise.resolve(false),
});

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      setPending({ message, options: { variant: 'default', ...options }, resolve });
    });
  }, []);

  const handleResult = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  const isDanger = pending?.options.variant === 'danger';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                {isDanger && <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />}
                <h3 className="font-semibold text-sm text-app-text">
                  {pending.options.title ?? (isDanger ? 'Silme Onayı' : 'Onay')}
                </h3>
              </div>
              <button
                onClick={() => handleResult(false)}
                className="p-1 rounded hover:bg-app-accent-soft transition-colors text-app-muted hover:text-app-text"
                aria-label="İptal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm text-app-text leading-relaxed">{pending.message}</p>
            </div>

            <div className="flex gap-2.5 px-5 pb-5">
              <button
                onClick={() => handleResult(false)}
                className="flex-1 py-2 rounded-lg text-sm border border-app-border bg-app-base text-app-text hover:bg-app-accent-soft transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => handleResult(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  isDanger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {pending.options.confirmLabel ?? (isDanger ? 'Sil' : 'Onayla')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </ConfirmContext.Provider>
  );
}
