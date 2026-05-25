"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Upload, FileJson, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { PlanTree } from "@/lib/types/database";

type Format = "json" | "csv";

interface ImportError {
  path: string;
  message: string;
}

export function PlanImportForm() {
  const router = useRouter();
  const [format, setFormat] = useState<Format>("json");
  const [fileName, setFileName] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState<string>("");
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [meta, setMeta] = useState({
    title: "",
    description: "",
    total_weeks: 16,
    start_date: "",
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [preview, setPreview] = useState<PlanTree | null>(null);
  const [committed, setCommitted] = useState<string | null>(null);

  function reset() {
    setErrors([]);
    setPreview(null);
    setCommitted(null);
  }

  function onFile(file: File) {
    reset();
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      if (format === "json") {
        setJsonText(text);
      } else {
        const parsed = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: true,
        });
        setCsvRows(parsed.data);
      }
    };
    reader.readAsText(file);
  }

  async function run(mode: "dry-run" | "commit") {
    reset();
    setBusy(true);
    try {
      const body =
        format === "json"
          ? { format, mode, json: safeParseJson(jsonText) }
          : { format, mode, meta, rows: csvRows };
      const res = await fetch("/api/plans/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setErrors([{ path: "", message: data.error ?? "Failed" }]);
        return;
      }
      if (mode === "dry-run") {
        setPreview(data.tree);
      } else {
        setCommitted(data.planId);
        router.refresh();
      }
    } catch (e) {
      setErrors([
        { path: "", message: e instanceof Error ? e.message : "Network error" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <FormatToggle current={format} onChange={(f) => { setFormat(f); reset(); setFileName(null); }} />
      </div>

      {format === "csv" && (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Plan metadata (CSV is task rows only)
            </p>
          </div>
          <LabeledInput
            label="Plan title"
            value={meta.title}
            onChange={(v) => setMeta({ ...meta, title: v })}
          />
          <LabeledInput
            label="Total weeks"
            type="number"
            value={String(meta.total_weeks)}
            onChange={(v) => setMeta({ ...meta, total_weeks: Number(v) || 1 })}
          />
          <LabeledInput
            label="Description"
            value={meta.description}
            onChange={(v) => setMeta({ ...meta, description: v })}
            className="sm:col-span-2"
          />
          <LabeledInput
            label="Start date (YYYY-MM-DD, optional)"
            value={meta.start_date}
            onChange={(v) => setMeta({ ...meta, start_date: v })}
            className="sm:col-span-2"
          />
        </div>
      )}

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center transition-colors hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-500">
        <Upload className="mb-2 h-6 w-6 text-slate-400 dark:text-slate-500" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {fileName ?? `Choose a ${format.toUpperCase()} file`}
        </span>
        <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {format === "json"
            ? "Nested: title, description, total_weeks, phases[]"
            : "Flat: phase_number, phase_title, week_number, task_title, task_type, sort_order"}
        </span>
        <input
          type="file"
          accept={format === "json" ? "application/json,.json" : "text/csv,.csv"}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => run("dry-run")}
          disabled={busy || (format === "json" ? !jsonText : csvRows.length === 0)}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
          Validate (dry-run)
        </button>
        <button
          onClick={() => run("commit")}
          disabled={busy || !preview}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Commit import
        </button>
      </div>

      {errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/40 dark:bg-red-500/10">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" />
            {errors.length} validation {errors.length === 1 ? "error" : "errors"}
          </div>
          <ul className="space-y-1 text-xs text-red-700 dark:text-red-300">
            {errors.slice(0, 10).map((err, i) => (
              <li key={i}>
                <span className="font-mono">{err.path || "—"}</span>: {err.message}
              </li>
            ))}
          </ul>
          {errors.length > 10 && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              +{errors.length - 10} more
            </p>
          )}
        </div>
      )}

      {committed && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
          Plan created. <a className="font-semibold underline" href={`/plan/${committed}/manage`}>Open</a>
        </div>
      )}

      {preview && !committed && <PreviewTable tree={preview} />}
    </div>
  );
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function FormatToggle({
  current,
  onChange,
}: {
  current: Format;
  onChange: (f: Format) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
      {(["json", "csv"] as Format[]).map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            current === f
              ? "bg-slate-900 text-white dark:bg-emerald-600"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {f === "json" ? <FileJson className="h-3.5 w-3.5" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
          {f.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
    </label>
  );
}

function PreviewTable({ tree }: { tree: PlanTree }) {
  const totalTasks = tree.phases.reduce((acc, p) => acc + p.tasks.length, 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Preview — {tree.title}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {tree.phases.length} {tree.phases.length === 1 ? "phase" : "phases"} ·{" "}
          {totalTasks} {totalTasks === 1 ? "task" : "tasks"} · {tree.total_weeks}{" "}
          weeks
        </p>
      </div>
      <div className="space-y-2">
        {tree.phases.map((phase) => (
          <details
            key={phase.phase_number}
            className="rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200">
              Phase {phase.phase_number}: {phase.title}{" "}
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({phase.tasks.length} tasks)
              </span>
            </summary>
            <ul className="space-y-1 px-4 py-2 text-xs text-slate-600 dark:text-slate-300">
              {phase.tasks.map((t, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    W{t.week_number}
                  </span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    {t.task_type}
                  </span>
                  <span className="truncate">{t.title}</span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
