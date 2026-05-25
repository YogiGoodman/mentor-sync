import { Users, BookOpen, Inbox, CheckCircle2 } from "lucide-react";
import type { MentorOverview } from "@/lib/dashboard-stats";

interface MentorOverviewTilesProps {
  overview: MentorOverview;
}

export function MentorOverviewTiles({ overview }: MentorOverviewTilesProps) {
  const tiles = [
    {
      label: "Active plans",
      value: overview.total_plans,
      icon: BookOpen,
      color: "text-slate-700 dark:text-slate-200",
      bg: "bg-slate-50 dark:bg-slate-800",
    },
    {
      label: "Mentees",
      value: overview.total_mentees,
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/15",
    },
    {
      label: "Pending requests",
      value: overview.pending_requests,
      icon: Inbox,
      color:
        overview.pending_requests > 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-slate-400 dark:text-slate-500",
      bg:
        overview.pending_requests > 0
          ? "bg-amber-50 dark:bg-amber-500/15"
          : "bg-slate-50 dark:bg-slate-800",
    },
    {
      label: "Done this week",
      value: overview.completions_this_week,
      icon: CheckCircle2,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-500/15",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${tile.bg}`}
            >
              <tile.icon className={`h-4 w-4 ${tile.color}`} />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {tile.label}
            </span>
          </div>
          <p className={`mt-2 text-2xl font-bold ${tile.color}`}>{tile.value}</p>
        </div>
      ))}
    </div>
  );
}
