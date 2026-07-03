"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "error" | "success" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  error: () => {},
  success: () => {},
  info: () => {},
  warning: () => {},
});

const ICONS: Record<ToastType, React.ReactNode> = {
  error: <AlertCircle className="w-4 h-4 shrink-0" />,
  success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
  info: <Info className="w-4 h-4 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 shrink-0" />,
};

const STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  error:   { bg: "bg-red-950",    border: "border-red-800",    icon: "text-red-400"    },
  success: { bg: "bg-green-950",  border: "border-green-800",  icon: "text-green-400"  },
  info:    { bg: "bg-neutral-900",border: "border-neutral-700",icon: "text-blue-400"   },
  warning: { bg: "bg-yellow-950", border: "border-yellow-800", icon: "text-yellow-400" },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const s = STYLES[toast.type];

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration ?? 4000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast.id, toast.duration, onRemove]);

  function dismiss() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 w-full max-w-sm px-4 py-3 rounded-xl border shadow-2xl text-sm",
        "transition-all duration-300 ease-out",
        s.bg, s.border,
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
    >
      <span className={cn("mt-0.5", s.icon)}>{ICONS[toast.type]}</span>
      <p className="flex-1 text-neutral-100 leading-relaxed">{toast.message}</p>
      <button
        onClick={dismiss}
        className="mt-0.5 text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info", duration?: number) => {
    const id = Math.random().toString(36).slice(2, 10);
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }]);
  }, []);

  const error   = useCallback((m: string) => toast(m, "error", 6000), [toast]);
  const success = useCallback((m: string) => toast(m, "success", 3000), [toast]);
  const info    = useCallback((m: string) => toast(m, "info",    4000), [toast]);
  const warning = useCallback((m: string) => toast(m, "warning", 5000), [toast]);

  return (
    <ToastContext.Provider value={{ toast, error, success, info, warning }}>
      {children}
      {/* Snackbar stack — bottom center */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse gap-2 items-center pointer-events-none w-full px-4"
        style={{ maxWidth: "420px" }}>
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto w-full">
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
