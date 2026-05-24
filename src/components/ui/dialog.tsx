"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  /** Tailwind max-width class. Default `max-w-lg`. */
  maxWidthClass?: string;
}

export function Dialog({
  open,
  onClose,
  children,
  title,
  subtitle,
  maxWidthClass = "max-w-lg",
}: DialogProps) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in dark:bg-black/60"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex w-full flex-col rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200/70 sm:rounded-2xl dark:bg-slate-900 dark:ring-slate-800",
          "max-h-[90vh] sm:max-h-[80vh]",
          maxWidthClass
        )}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div className="min-w-0">
              {title && (
                <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
