import { Flame, Gauge, CalendarCheck, AlertTriangle } from "lucide-react";
import type { Momentum, Pace } from "@/lib/momentum";
import { PACE_LABEL } from "@/lib/momentum";

const PACE_STYLE: Record<Pace, string> = {
  ahead:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  on_track:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  behind:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  not_started:
    "bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
};

function Metric({
  icon: Icon,
  value,
  label,
  tone = "default",
}: {
  icon: typeof Flame;
  value: string;
  label: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon
        className={`h-4 w-4 ${
          tone === "warn"
            ? "text-amber-500 dark:text-amber-400"
            : "text-slate-400 dark:text-slate-500"
        }`}
      />
      <div className="leading-tight">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {value}
        </span>
        <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
    </div>
  );
}

export function MomentumStrip({ momentum }: { momentum: Momentum }) {
  const m = momentum;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${PACE_STYLE[m.pace]}`}
      >
        {PACE_LABEL[m.pace]}
        {m.currentWeek !== null && (
          <span className="ml-1.5 font-normal opacity-70">
            wk {m.currentWeek}/{m.totalWeeks}
          </span>
        )}
      </span>

      <Metric
        icon={Flame}
        value={String(m.streak)}
        label={m.streak === 1 ? "day streak" : "day streak"}
      />
      <Metric icon={Gauge} value={`${m.onTimePercent}%`} label="on schedule" />
      <Metric icon={CalendarCheck} value={String(m.last7)} label="done this week" />
      {m.blockers > 0 && (
        <Metric
          icon={AlertTriangle}
          value={String(m.blockers)}
          label={m.blockers === 1 ? "blocker" : "blockers"}
          tone="warn"
        />
      )}
    </div>
  );
}
