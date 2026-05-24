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
} from "lucide-react";
import { ensureProfile } from "@/lib/supabase/profile";
import { fetchPlansForUser } from "@/lib/queries/plans";
import { fetchPlanStats, aggregateStats } from "@/lib/dashboard-stats";
import { DashboardPlanCard } from "@/components/dashboard-plan-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!profile) redirect("/login");

  const { plans, error: plansError } = await fetchPlansForUser(
    supabase,
    user.id,
    profile.role
  );

  const allPlanStats = await Promise.all(
    plans.map((plan) => fetchPlanStats(supabase, plan))
  );

  const agg = aggregateStats(allPlanStats);

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
    <div className="relative mx-auto max-w-5xl space-y-6">
      {/* Abstract background layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-72 overflow-hidden"
      >
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-100/70 via-emerald-50/40 to-transparent blur-3xl dark:from-emerald-500/15 dark:via-emerald-500/5" />
        <div className="absolute right-0 top-10 h-64 w-64 rounded-full bg-gradient-to-bl from-amber-100/60 via-rose-50/30 to-transparent blur-3xl dark:from-amber-500/10 dark:via-rose-500/5" />
        <div className="bg-grid-fade absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)] dark:opacity-40" />
      </div>

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">
            Welcome back, {profile.name}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {profile.role === "mentor"
              ? "Track your mentees' progress and stay in sync"
              : "Your learning journey at a glance"}
          </p>
        </div>
        {profile.role === "mentor" && (
          <Link
            href="/plan/create"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-colors dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            New Plan
          </Link>
        )}
      </div>

      {plansError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          Could not load plans: {plansError}
        </div>
      )}

      {plans.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Zap className="h-7 w-7 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {profile.role === "mentor"
              ? "Create your first plan"
              : "No plans yet"}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {profile.role === "mentor"
              ? "Set up a learning plan to start tracking progress with your mentee."
              : "Your mentor hasn't assigned you to a plan yet. Hang tight!"}
          </p>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Signed in as {profile.role} ({user.email})
          </p>
          {profile.role === "mentor" && (
            <Link
              href="/plan/create"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Create Plan
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Stats tiles */}
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

          {/* Plan cards */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-800 uppercase tracking-wide dark:text-slate-300">
              Your Plans
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
