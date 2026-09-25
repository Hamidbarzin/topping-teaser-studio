import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createId } from "../utils/id";

interface ToastItem {
  id: string;
  message: string;
  tone: "info" | "error";
}

interface ToastValue {
  notify: (message: string, tone?: "info" | "error") => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((message: string, tone: "info" | "error" = "info") => {
    const id = createId();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 end-4 z-50 flex w-[min(100%-2rem,22rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto rounded-2xl border px-3 py-2.5 text-sm shadow-[var(--brand-shadow)] ${
              toast.tone === "error"
                ? "border-maple/40 bg-panel text-ink"
                : "border-line bg-panel text-ink"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("Toast missing");
  return value;
}
