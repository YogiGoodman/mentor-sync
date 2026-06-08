import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PlanView } from "./plan-view";
import type { Phase, Role } from "@/lib/types/database";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface PlanPageProps {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ mentee?: string }>;
}

export default async function PlanPage({ params, searchParams }: PlanPageProps) {
  const { planId } = await params;
  const { mentee: menteeParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (!plan) notFound();

  const { data: phases } = await supabase
    .from("phases")
    .select("*")
    .eq("plan_id", planId)
    .order("phase_number");

  // Resolve the per-mentee context. A mentee always views their own instance.
  // A mentor must pick a mentee (?mentee=) that is assigned to the plan; without
  // one they see the read-only template overview.
  const role = profile.role as Role;
  let menteeId: string | null = null;
  let menteeName: string | null = null;

  if (role === "mentee") {
    menteeId = user.id;
  } else if (menteeParam) {
    const { data: assignment } = await supabase
      .from("plan_assignments")
      .select("mentee_id")
      .eq("plan_id", planId)
      .eq("mentee_id", menteeParam)
      .maybeSingle();
    if (assignment) {
      menteeId = menteeParam;
      const { data: m } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", menteeParam)
        .single();
      menteeName = m?.name ?? null;
    }
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      }
    >
      <PlanView
        plan={plan}
        phases={(phases as Phase[]) ?? []}
        userId={user.id}
        role={role}
        menteeId={menteeId}
        menteeName={menteeName}
        interactive={role === "mentee"}
      />
    </Suspense>
  );
}
