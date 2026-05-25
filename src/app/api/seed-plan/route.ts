import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PLAN_TITLE, PLAN_DESCRIPTION, phases } from "@/seed/plan-data";
import { createPlanFromTree } from "@/lib/plans/create-plan-from-tree";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secret = process.env.SUPABASE_SECRET_KEY!;
  if (!url || !secret) throw new Error("Missing SUPABASE_SECRET_KEY");
  return createAdminClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST() {
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
    return NextResponse.json(
      { error: "Only mentors can load sample plans" },
      { status: 403 }
    );
  }

  const admin = getAdminClient();

  const { data: existing } = await admin
    .from("plans")
    .select("id")
    .eq("title", PLAN_TITLE)
    .eq("created_by", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Sample plan already exists" },
      { status: 409 }
    );
  }

  const { planId, error } = await createPlanFromTree(
    admin,
    {
      title: PLAN_TITLE,
      description: PLAN_DESCRIPTION,
      total_weeks: 16,
      start_date: null,
      phases: phases.map((p) => ({
        phase_number: p.phase_number,
        title: p.title,
        description: p.description,
        strategic_focus: p.strategic_focus,
        tasks: p.tasks,
      })),
    },
    user.id
  );

  if (error || !planId) {
    return NextResponse.json(
      { error: error ?? "Failed to create plan" },
      { status: 500 }
    );
  }

  return NextResponse.json({ planId });
}
