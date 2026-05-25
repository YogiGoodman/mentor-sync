import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
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
  if (!profile || profile.role !== "mentee") {
    return NextResponse.json(
      { error: "Only mentees can request access" },
      { status: 403 }
    );
  }

  let body: { message?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const message =
    typeof body.message === "string" ? body.message.slice(0, 500) : null;

  // verify plan is_public — relying on RLS would surface only summary, but
  // be explicit so a non-public plan returns 404 rather than silent insert.
  const { data: plan } = await supabase
    .from("plans")
    .select("id, is_public")
    .eq("id", planId)
    .maybeSingle();
  if (!plan || !plan.is_public) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("plan_access_requests")
    .insert({ plan_id: planId, mentee_id: user.id, message });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Request already pending" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
