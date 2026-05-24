import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PlanView } from "./plan-view";
import type { Phase, Role } from "@/lib/types/database";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface PlanPageProps {
  params: Promise<{ planId: string }>;
}

export default async function PlanPage({ params }: PlanPageProps) {
  const { planId } = await params;
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
        role={profile.role as Role}
      />
    </Suspense>
  );
}
