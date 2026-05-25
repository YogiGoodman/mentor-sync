import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PLAN_TITLE, PLAN_DESCRIPTION, phases } from "@/seed/plan-data";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secret = process.env.SUPABASE_SECRET_KEY!;
  if (!url || !secret) throw new Error("Missing SUPABASE_SECRET_KEY");
  return createAdminClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST() {
  // Auth checks via session client (reads JWT from cookies correctly)
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "mentor") {
    return NextResponse.json({ error: "Only mentors can load sample plans" }, { status: 403 });
  }

  // Data writes via service-role client — bypasses RLS since we've already
  // verified auth + role above.
  const admin = getAdminClient();

  const { data: existing } = await admin
    .from("plans")
    .select("id")
    .eq("title", PLAN_TITLE)
    .eq("created_by", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Sample plan already exists" }, { status: 409 });
  }

  const { data: plan, error: planError } = await admin
    .from("plans")
    .insert({
      title: PLAN_TITLE,
      description: PLAN_DESCRIPTION,
      total_weeks: 16,
      created_by: user.id,
    })
    .select()
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: planError?.message ?? "Failed to create plan" }, { status: 500 });
  }

  for (const phaseData of phases) {
    const { data: phase, error: phaseError } = await admin
      .from("phases")
      .insert({
        plan_id: plan.id,
        phase_number: phaseData.phase_number,
        title: phaseData.title,
        description: phaseData.description,
        strategic_focus: phaseData.strategic_focus,
      })
      .select()
      .single();

    if (phaseError || !phase) continue;

    await admin.from("tasks").insert(
      phaseData.tasks.map((t) => ({
        phase_id: phase.id,
        week_number: t.week_number,
        title: t.title,
        task_type: t.task_type,
        sort_order: t.sort_order,
      }))
    );
  }

  return NextResponse.json({ planId: plan.id });
}
