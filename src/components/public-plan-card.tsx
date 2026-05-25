import Link from "next/link";
import { ArrowRight, Calendar, Layers } from "lucide-react";
import type { PublicPlanSummary } from "@/lib/queries/discovery";

interface PublicPlanCardProps {
  plan: PublicPlanSummary;
  showMentor?: boolean;
}

export function PublicPlanCard({ plan, showMentor = true }: PublicPlanCardProps) {
  return (
    <Link
      href={`/explore/plans/${plan.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors dark:text-white dark:group-hover:text-emerald-400">
            {plan.title}
          </h3>
          {plan.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
              {plan.description}
            </p>
          )}
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-emerald-500 dark:text-slate-600 dark:group-hover:text-emerald-400" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {plan.total_weeks} weeks
        </span>
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3.5 w-3.5" />
          {plan.phase_count} {plan.phase_count === 1 ? "phase" : "phases"}
        </span>
        {showMentor && plan.mentor && (
          <span className="truncate">by {plan.mentor.name}</span>
        )}
      </div>
    </Link>
  );
}
