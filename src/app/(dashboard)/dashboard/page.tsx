import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  BarChart3,
  CheckCircle2,
  Flame,
  AlertTriangle,
  Zap,
  Compass,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { ensureProfile } from "@/lib/supabase/profile";
import {
  fetchPlansForUser,
  listMentorPlansWithCounts,
  listAtRiskMentees,
} from "@/lib/queries/plans";
import {
  fetchPlanStats,
  aggregateStats,
  computeMentorOverview,
} from "@/lib/dashboard-stats";
import { listForMentee } from "@/lib/queries/access-requests";
import { DashboardPlanCard } from "@/components/dashboard-plan-card";
import { SeedPlanButton } from "@/components/seed-plan-button";
import { MentorOverviewTiles } from "@/components/mentor-overview-tiles";
import { MentorPlanCard } from "@/components/mentor-plan-card";
import { AtRiskPanel } from "@/components/at-risk-panel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!profile) redirect("/login");

  if (profile.role === "mentor") {
    return <MentorDashboard userId={user.id} userName={profile.name} />;
  }
  return <MenteeDashboard userId={user.id} userName={profile.name} />;
}

async function MentorDashboard({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const supabase = await createClient();
  const [{ plans }, overview] = await Promise.all([
    listMentorPlansWithCounts(supabase, userId),
    computeMentorOverview(supabase, userId),
  ]);

  const [allPlanStats, atRisk] = await Promise.all([
    Promise.all(plans.map((plan) => fetchPlanStats(supabase, plan))),
    listAtRiskMentees(
      supabase,
      plans.map((p) => ({ id: p.id, title: p.title }))
    ),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {userName}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Track your mentees&apos; progress and stay in sync
          </p>
        </div>
        {plans.length > 0 && (
          <Link
            href="/plan/create"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            New Plan
          </Link>
        )}
      </div>

      <MentorOverviewTiles overview={overview} />

      <AtRiskPanel mentees={atRisk} />

      {plans.length === 0 ? (
        <EmptyState role="mentor" />
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-300">
              Your plans
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {allPlanStats.map((ps) => {
                const enriched = plans.find((p) => p.id === ps.plan.id);
                return (
                  <MentorPlanCard
                    key={ps.plan.id}
                    plan={ps.plan}
                    menteeCount={enriched?.mentee_count ?? 0}
                    pendingRequestCount={enriched?.pending_request_count ?? 0}
                    completedAtDates={ps.completedAtDates}
                  />
                );
              })}
            </div>
          </section>

          {overview.recent_activity.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-300">
                Recent activity
              </h2>
              <ul className="space-y-1.5">
                {overview.recent_activity.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                    <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                      {a.task_title}
                    </span>
                    <span className="hidden truncate text-xs text-slate-500 sm:inline dark:text-slate-400">
                      {a.plan_title}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      <Clock className="mr-0.5 inline h-3 w-3" />
                      {new Date(a.completed_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

async function MenteeDashboard({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const supabase = await createClient();
  const [{ plans }, { requests }] = await Promise.all([
    fetchPlansForUser(supabase, userId, "mentee"),
    listForMentee(supabase, userId),
  ]);

  const allPlanStats = await Promise.all(
    plans.map((plan) => fetchPlanStats(supabase, plan, userId))
  );
  const agg = aggregateStats(allPlanStats);

  const pending = requests.filter((r) => r.status === "pending");

  const statTiles = [
    {
      label: "Plans",
      value: agg.totalPlans,
      icon: BarChart3,
      color: "text-slate-700 dark:text-slate-200",
      bg: "bg-slate-50 dark:bg-slate-800",
    },
    {
      label: "Completed",
      value: `${agg.completionPercent}%`,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/15",
    },
    {
      label: "Active Days",
      value: agg.totalActiveDays,
      icon: Flame,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-500/15",
    },
    {
      label: "Blockers",
      value: agg.totalBlocked,
      icon: AlertTriangle,
      color:
        agg.totalBlocked > 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-slate-400 dark:text-slate-500",
      bg:
        agg.totalBlocked > 0
          ? "bg-amber-50 dark:bg-amber-500/15"
          : "bg-slate-50 dark:bg-slate-800",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {userName}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Your learning journey at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/p/${userId}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Share progress</span>
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <Compass className="h-4 w-4" />
            Explore mentors
          </Link>
        </div>
      </div>

      {pending.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="text-amber-800 dark:text-amber-300">
            You have {pending.length} pending request{pending.length === 1 ? "" : "s"}:{" "}
            {pending.map((r, i) => (
              <span key={r.id}>
                {i > 0 && ", "}
                <span className="font-medium">{r.plan.title}</span>
              </span>
            ))}
          </p>
        </section>
      )}

      {plans.length === 0 ? (
        <EmptyState role="mentee" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statTiles.map((tile) => (
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
                <p className={`mt-2 text-2xl font-bold ${tile.color}`}>
                  {tile.value}
                </p>
              </div>
            ))}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-300">
              Your plans
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {allPlanStats.map((ps) => (
                <DashboardPlanCard
                  key={ps.plan.id}
                  plan={ps.plan}
                  completed={ps.completed}
                  total={ps.total}
                  blockedCount={ps.blockedCount}
                  activeDays={ps.activeDays}
                  currentWeek={ps.currentWeek}
                  completedAtDates={ps.completedAtDates}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ role }: { role: "mentor" | "mentee" }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Zap className="h-7 w-7 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        {role === "mentor" ? "Create your first plan" : "No plans yet"}
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {role === "mentor"
          ? "Set up a learning plan to start tracking progress with your mentees."
          : "Explore mentors and request access to one of their public plans."}
      </p>
      {role === "mentor" ? (
        <>
          <Link
            href="/plan/create"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Create Plan
          </Link>
          <SeedPlanButton />
        </>
      ) : (
        <Link
          href="/explore"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          <Compass className="h-4 w-4" />
          Explore mentors
        </Link>
      )}
    </div>
  );
}
