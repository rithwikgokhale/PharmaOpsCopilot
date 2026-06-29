import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, AlertTriangle } from "lucide-react";

type ToastTone = "success" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { icon: ReactNode; cls: string }> = {
  success: {
    icon: <CheckCircle2 size={16} />,
    cls: "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/40 dark:text-green-200",
  },
  info: {
    icon: <Info size={16} />,
    cls: "border-accent-400 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    cls: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-card-hover ${TONE_STYLES[t.tone].cls}`}
            >
              <span className="mt-0.5 shrink-0">{TONE_STYLES[t.tone].icon}</span>
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 opacity-60 hover:opacity-100"
                aria-label="Dismiss"
              >
                <X size={14} />
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
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
