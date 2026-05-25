"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { classNames } from "@/lib/utils";

export type ToastVariant = "success" | "error";

export type ToastProps = {
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
  autoHideMs?: number;
};

export function Toast({
  message,
  variant = "success",
  onClose,
  autoHideMs = 4000,
}: ToastProps) {
  useEffect(() => {
    if (autoHideMs <= 0) return;
    const timer = setTimeout(onClose, autoHideMs);
    return () => clearTimeout(timer);
  }, [autoHideMs, onClose]);

  const isSuccess = variant === "success";

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 sm:bottom-8"
    >
      <div
        className={classNames(
          "pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 shadow-card backdrop-blur",
          isSuccess
            ? "bg-emerald-50/95 text-emerald-900 ring-1 ring-emerald-200"
            : "bg-rose-50/95 text-rose-900 ring-1 ring-rose-200",
        )}
      >
        <span
          className={classNames(
            "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full",
            isSuccess ? "bg-emerald-500 text-white" : "bg-rose-500 text-white",
          )}
        >
          {isSuccess ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        </span>
        <p className="max-w-xs text-sm leading-snug sm:max-w-sm">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 mt-0.5 rounded-full p-1 text-slate-500 transition hover:bg-black/5 hover:text-slate-700"
          aria-label="Hinweis schliessen"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
