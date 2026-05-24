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
      color: "text-slate-700",
      bg: "bg-slate-50",
    },
    {
      label: "Completed",
      value: `${agg.completionPercent}%`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Active Days",
      value: agg.totalActiveDays,
      icon: Flame,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Blockers",
      value: agg.totalBlocked,
      icon: AlertTriangle,
      color: agg.totalBlocked > 0 ? "text-amber-600" : "text-slate-400",
      bg: agg.totalBlocked > 0 ? "bg-amber-50" : "bg-slate-50",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {profile.name}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {profile.role === "mentor"
              ? "Track your mentees' progress and stay in sync"
              : "Your learning journey at a glance"}
          </p>
        </div>
        {profile.role === "mentor" && (
          <Link
            href="/plan/create"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Plan
          </Link>
        )}
      </div>

      {plansError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load plans: {plansError}
        </div>
      )}

      {plans.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Zap className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">
            {profile.role === "mentor"
              ? "Create your first plan"
              : "No plans yet"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {profile.role === "mentor"
              ? "Set up a learning plan to start tracking progress with your mentee."
              : "Your mentor hasn't assigned you to a plan yet. Hang tight!"}
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Signed in as {profile.role} ({user.email})
          </p>
          {profile.role === "mentor" && (
            <Link
              href="/plan/create"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
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
                className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${tile.bg}`}
                  >
                    <tile.icon className={`h-4 w-4 ${tile.color}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-500">
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
            <h2 className="mb-3 text-sm font-semibold text-slate-800 uppercase tracking-wide">
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
