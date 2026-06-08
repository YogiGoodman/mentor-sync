import { notFound } from "next/navigation";
import Link from "next/link";
import { BookOpen, CheckCircle2, Flame, CalendarRange, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { parseTimestamp } from "@/lib/heatmap";

export const dynamic = "force-dynamic";

interface ProofSummary {
  mentee: { name: string; headline: string | null; avatar_url: string | null } | null;
  total_completed: number;
  active_days: number;
  first_activity: string | null;
  last_activity: string | null;
  plans: { title: string; total: number; completed: number }[];
  completions: { task_title: string; completed_at: string; plan_title: string }[];
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function currentStreak(completions: { completed_at: string }[]): number {
  const days = new Set(
    completions.map((c) => dateKey(parseTimestamp(c.completed_at)))
  );
  let streak = 0;
  const check = new Date();
  check.setHours(0, 0, 0, 0);
  if (!days.has(dateKey(check))) check.setDate(check.getDate() - 1);
  while (days.has(dateKey(check))) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

export default async function ProofPage({
  params,
}: {
  params: Promise<{ menteeId: string }>;
}) {
  const { menteeId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_proof_summary", {
    p_mentee_id: menteeId,
  });

  const summary = data as ProofSummary | null;
  if (error || !summary || !summary.mentee) notFound();

  const { mentee } = summary;
  const streak = currentStreak(summary.completions);
  const span =
    summary.first_activity && summary.last_activity
      ? Math.max(
          1,
          Math.round(
            (parseTimestamp(summary.last_activity).getTime() -
              parseTimestamp(summary.first_activity).getTime()) /
              86400000
          ) + 1
        )
      : 0;

  const stats = [
    { icon: CheckCircle2, value: summary.total_completed, label: "tasks completed" },
    { icon: Flame, value: streak, label: "day streak" },
    { icon: CalendarRange, value: summary.active_days, label: "active days" },
    { icon: BookOpen, value: summary.plans.length, label: "plans" },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        {/* Header */}
        <header className="flex items-center gap-4">
          {mentee.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mentee.avatar_url}
              alt={mentee.name}
              className="h-14 w-14 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {mentee.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">{mentee.name}</h1>
            {mentee.headline && (
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                {mentee.headline}
              </p>
            )}
          </div>
        </header>

        {/* Stats */}
        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-200 px-4 py-3.5 dark:border-slate-800"
            >
              <s.icon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <p className="mt-2 text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          ))}
        </section>

        {span > 0 && (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Sustained over {span} days of tracked work.
          </p>
        )}

        {/* Plans */}
        {summary.plans.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Plans
            </h2>
            <div className="mt-3 space-y-3">
              {summary.plans.map((p) => {
                const pct =
                  p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
                return (
                  <div key={p.title}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-sm font-medium">{p.title}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {p.completed}/{p.total} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent completions */}
        {summary.completions.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Recent work
            </h2>
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {summary.completions.slice(0, 12).map((c, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {c.task_title}
                    <span className="text-slate-400 dark:text-slate-500">
                      {" "}
                      · {c.plan_title}
                    </span>
                  </span>
                  <time className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {parseTimestamp(c.completed_at).toLocaleDateString()}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Verification footer */}
        <footer className="mt-12 flex items-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          <ShieldCheck className="h-4 w-4" />
          <span>
            Every entry is backed by a real completion timestamp on{" "}
            <Link href="/" className="font-medium text-slate-500 underline-offset-2 hover:underline dark:text-slate-400">
              MentorSync
            </Link>
            .
          </span>
        </footer>
      </div>
    </main>
  );
}
