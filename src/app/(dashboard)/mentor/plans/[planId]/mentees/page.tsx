import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profile";
import { listMenteesForPlan } from "@/lib/queries/plans";
import { MenteeRosterTable } from "@/components/mentee-roster-table";

export const dynamic = "force-dynamic";

export default async function MentorPlanMenteesPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!profile) redirect("/login");
  if (profile.role !== "mentor") redirect("/dashboard");

  const { data: plan } = await supabase
    .from("plans")
    .select("id, title, created_by")
    .eq("id", planId)
    .maybeSingle();
  if (!plan || plan.created_by !== user.id) notFound();

  const { rows, error } = await listMenteesForPlan(supabase, planId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {plan.title}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Enrolled mentees and their progress on this plan.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <MenteeRosterTable rows={rows} planId={planId} />
    </div>
  );
}
