import { CheckCircle2, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink shadow-lg"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      <span className="font-medium">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-2 rounded p-1 text-ink-muted hover:bg-hover hover:text-ink transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
