import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { jsonToPlan } from "@/lib/import/json-to-plan";
import { csvToPlan } from "@/lib/import/csv-to-plan";
import { createPlanFromTree } from "@/lib/plans/create-plan-from-tree";

interface ImportRequestBody {
  format: "json" | "csv";
  mode: "dry-run" | "commit";
  // JSON path
  json?: unknown;
  // CSV path
  meta?: unknown;
  rows?: unknown[];
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secret = process.env.SUPABASE_SECRET_KEY!;
  if (!url || !secret) throw new Error("Missing SUPABASE_SECRET_KEY");
  return createAdminClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
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
      { error: "Only mentors can import plans" },
      { status: 403 }
    );
  }

  let body: ImportRequestBody;
  try {
    body = (await request.json()) as ImportRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { format, mode } = body;
  if (format !== "json" && format !== "csv") {
    return NextResponse.json(
      { error: "format must be 'json' or 'csv'" },
      { status: 400 }
    );
  }
  if (mode !== "dry-run" && mode !== "commit") {
    return NextResponse.json(
      { error: "mode must be 'dry-run' or 'commit'" },
      { status: 400 }
    );
  }

  const result =
    format === "json"
      ? jsonToPlan(body.json)
      : csvToPlan({ meta: body.meta, rows: body.rows ?? [] });

  if (result.errors.length > 0 || !result.tree) {
    return NextResponse.json(
      { errors: result.errors, tree: null },
      { status: 422 }
    );
  }

  if (mode === "dry-run") {
    return NextResponse.json({ tree: result.tree, errors: [] });
  }

  // commit
  const admin = getAdminClient();
  const { planId, error } = await createPlanFromTree(
    admin,
    result.tree,
    user.id
  );
  if (error || !planId) {
    return NextResponse.json(
      { error: error ?? "Failed to create plan" },
      { status: 500 }
    );
  }
  return NextResponse.json({ planId, tree: result.tree });
}
