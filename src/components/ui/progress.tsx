"use client";

import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
}

export function Progress({ value, className }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500 ease-out",
          clamped >= 100
            ? "bg-emerald-500 dark:bg-emerald-400"
            : clamped >= 50
            ? "bg-emerald-400 dark:bg-emerald-400"
            : "bg-emerald-300 dark:bg-emerald-500"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
