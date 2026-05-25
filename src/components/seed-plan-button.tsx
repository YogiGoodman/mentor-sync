"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export function SeedPlanButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleLoad() {
    setStatus("loading");
    setErrorMsg(null);

    const res = await fetch("/api/seed-plan", { method: "POST" });
    const json = await res.json();

    if (!res.ok) {
      setStatus("error");
      setErrorMsg(json.error ?? "Something went wrong");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      {/* Divider */}
      <div className="flex w-full max-w-[200px] items-center gap-3">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <span className="text-xs text-slate-400 dark:text-slate-500">or</span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      <button
        onClick={handleLoad}
        disabled={status === "loading"}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <Sparkles className="h-4 w-4 text-emerald-500" />
        {status === "loading" ? "Loading sample plan…" : "Load sample plan"}
      </button>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        16-week CCNP Cloud Engineer plan with phases &amp; tasks
      </p>

      {status === "error" && errorMsg && (
        <p className="text-xs text-red-500 dark:text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}
