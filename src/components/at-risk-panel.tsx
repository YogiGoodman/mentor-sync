import Link from "next/link";
import { AlertTriangle, Clock, TrendingDown, ArrowRight } from "lucide-react";
import type { AtRiskMentee } from "@/lib/queries/plans";

export function AtRiskPanel({ mentees }: { mentees: AtRiskMentee[] }) {
  if (mentees.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Needs attention
        </h2>
        <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          {mentees.length}
        </span>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {mentees.slice(0, 6).map((m) => {
          const pct = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;
          return (
            <li key={`${m.plan_id}:${m.mentee_id}`}>
              <Link
                href={`/plan/${m.plan_id}?mentee=${m.mentee_id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {m.name}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {m.plan_title} · {pct}% complete
                  </p>
                </div>
                <div className="hidden shrink-0 flex-wrap justify-end gap-1 sm:flex">
                  {m.behind && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      <TrendingDown className="h-3 w-3" /> Behind
                    </span>
                  )}
                  {m.stalled_days !== null && m.stalled_days >= 7 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Clock className="h-3 w-3" /> {m.stalled_days}d idle
                    </span>
                  )}
                  {m.blockers > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                      <AlertTriangle className="h-3 w-3" /> {m.blockers}
                    </span>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
