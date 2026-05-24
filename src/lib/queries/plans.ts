import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, Role } from "@/lib/types/database";

export interface PlansQueryResult {
  plans: Plan[];
  error: string | null;
}

export async function fetchPlansForUser(
  supabase: SupabaseClient,
  userId: string,
  role: Role
): Promise<PlansQueryResult> {
  if (role === "mentor") {
    // RLS policy already restricts to created_by = auth.uid()
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[fetchPlansForUser] mentor query error:", error.message);
      return { plans: [], error: error.message };
    }

    return { plans: (data as Plan[]) ?? [], error: null };
  }

  // Mentee: two-step fetch (more reliable than PostgREST nested join)
  const { data: assignments, error: assignError } = await supabase
    .from("plan_assignments")
    .select("plan_id")
    .eq("mentee_id", userId);

  if (assignError) {
    console.error(
      "[fetchPlansForUser] assignment query error:",
      assignError.message
    );
    return { plans: [], error: assignError.message };
  }

  if (!assignments?.length) {
    return { plans: [], error: null };
  }

  const planIds = assignments.map((a) => a.plan_id);
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .in("id", planIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchPlansForUser] mentee plans query error:", error.message);
    return { plans: [], error: error.message };
  }

  return { plans: (data as Plan[]) ?? [], error: null };
}
