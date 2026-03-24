/**
 * Lightweight toast notification — replaces window.alert() calls.
 * Usage:
 *   const [toasts, addToast, removeToast] = useToast();
 *   addToast('Something happened', 'success');   // or 'error' | 'info'
 *   return <><ToastContainer toasts={toasts} onDismiss={removeToast} />...</>
 */
import { useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let nextId = 1;

export function useToast(autoDismissMs = 4000) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (autoDismissMs > 0) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), autoDismissMs);
    }
    return id;
  }, [autoDismissMs]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return [toasts, add, remove] as const;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};
const colorMap = {
  success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
  error: 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400',
  info: 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-400',
};

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);
  const Icon = iconMap[toast.type];
  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300 ${colorMap[toast.type]} ${visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
