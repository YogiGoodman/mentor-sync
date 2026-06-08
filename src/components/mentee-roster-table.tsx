import Link from "next/link";
import { ArrowRight, AlertTriangle, Clock, TrendingDown, Check } from "lucide-react";
import type { MenteeRosterRow } from "@/lib/queries/plans";

function StatusChips({ row }: { row: MenteeRosterRow }) {
  if (!row.at_risk) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
        <Check className="h-3 w-3" /> On track
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {row.behind && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
          <TrendingDown className="h-3 w-3" /> Behind
        </span>
      )}
      {row.stalled_days !== null && row.stalled_days >= 7 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
          <Clock className="h-3 w-3" /> {row.stalled_days}d idle
        </span>
      )}
      {row.blockers > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30">
          <AlertTriangle className="h-3 w-3" /> {row.blockers} blocked
        </span>
      )}
    </div>
  );
}

interface MenteeRosterTableProps {
  rows: MenteeRosterRow[];
  planId: string;
}

export function MenteeRosterTable({ rows, planId }: MenteeRosterTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        No mentees enrolled in this plan yet.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Mentee</th>
            <th className="px-4 py-3 font-medium">Joined</th>
            <th className="px-4 py-3 font-medium">Progress</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Last activity</th>
            <th className="px-4 py-3 font-medium sr-only">Open</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => {
            const pct =
              r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
            return (
              <tr
                key={r.mentee_id}
                className="text-slate-700 dark:text-slate-200"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <RosterAvatar name={r.name} src={r.avatar_url} />
                    <span className="font-medium text-slate-900 dark:text-white">
                      {r.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {new Date(r.assigned_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full bg-emerald-500 dark:bg-emerald-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {r.completed}/{r.total} · {pct}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusChips row={r} />
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {r.last_activity
                    ? new Date(r.last_activity).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/plan/${planId}?mentee=${r.mentee_id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RosterAvatar({ name, src }: { name: string; src: string | null }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
      />
    );
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
      {initials || "?"}
    </div>
  );
}
