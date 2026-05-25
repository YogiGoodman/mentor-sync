import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPublicPlanSummary } from "@/lib/queries/discovery";
import { RequestAccessButton } from "./request-access-button";

export const dynamic = "force-dynamic";

export default async function PublicPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { plan } = await getPublicPlanSummary(supabase, planId);
  if (!plan) notFound();

  // Check if user already has access / pending request (for mentees only)
  let alreadyAssigned = false;
  let pendingRequest = false;
  let isOwner = false;
  let userRole: "mentor" | "mentee" | null = null;

  if (user) {
    isOwner = user.id === plan.created_by;
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    userRole = (prof?.role as "mentor" | "mentee") ?? null;

    if (userRole === "mentee") {
      const { data: assignment } = await supabase
        .from("plan_assignments")
        .select("id")
        .eq("plan_id", planId)
        .eq("mentee_id", user.id)
        .maybeSingle();
      alreadyAssigned = !!assignment;

      const { data: req } = await supabase
        .from("plan_access_requests")
        .select("id")
        .eq("plan_id", planId)
        .eq("mentee_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      pendingRequest = !!req;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to mentors
      </Link>

      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {plan.title}
        </h1>
        {plan.mentor && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            by{" "}
            <Link
              href={`/explore/mentors/${plan.mentor.id}`}
              className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {plan.mentor.name}
            </Link>
          </p>
        )}
        {plan.description && (
          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
            {plan.description}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {plan.total_weeks} weeks
          </span>
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {plan.phase_count} phases
          </span>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
          {!user && (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              Sign in to request access
            </Link>
          )}
          {user && isOwner && (
            <Link
              href={`/plan/${plan.id}/manage`}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              Manage your plan
            </Link>
          )}
          {user && !isOwner && userRole === "mentor" && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Mentors cannot request access to other mentors&apos; plans.
            </p>
          )}
          {user && !isOwner && userRole === "mentee" && alreadyAssigned && (
            <Link
              href={`/plan/${plan.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Open plan
            </Link>
          )}
          {user && !isOwner && userRole === "mentee" && !alreadyAssigned && (
            <RequestAccessButton
              planId={plan.id}
              planTitle={plan.title}
              alreadyPending={pendingRequest}
            />
          )}
        </div>
      </article>
    </div>
  );
}
