import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.rpc("reject_access_request", {
    p_request_id: id,
  });

  if (error) {
    const msg = error.message ?? "Failed";
    const status = msg.includes("forbidden")
      ? 403
      : msg.includes("not_found")
        ? 404
        : msg.includes("not_pending")
          ? 409
          : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ ok: true });
}
