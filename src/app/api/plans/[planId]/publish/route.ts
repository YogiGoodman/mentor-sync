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

  let body: { is_public?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (typeof body.is_public !== "boolean") {
    return NextResponse.json(
      { error: "is_public boolean required" },
      { status: 400 }
    );
  }

  // RLS "Mentors can update own plans" enforces ownership
  const { error } = await supabase
    .from("plans")
    .update({ is_public: body.is_public })
    .eq("id", planId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
