import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, Role } from "@/lib/types/database";

export interface MenteeRosterRow {
  mentee_id: string;
  name: string;
  avatar_url: string | null;
  assigned_at: string;
  completed: number;
  total: number;
  last_activity: string | null;
}

export interface MentorPlanCounts extends Plan {
  mentee_count: number;
  pending_request_count: number;
}

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

export async function listMenteesForPlan(
  supabase: SupabaseClient,
  planId: string
): Promise<{ rows: MenteeRosterRow[]; error: string | null }> {
  const { data: assignments, error } = await supabase
    .from("plan_assignments")
    .select(
      "mentee_id, assigned_at, mentee:profiles!plan_assignments_mentee_id_fkey(id, name, avatar_url)"
    )
    .eq("plan_id", planId);

  if (error) return { rows: [], error: error.message };
  if (!assignments?.length) return { rows: [], error: null };

  // task aggregate per mentee — fetch tasks for this plan + completion events
  // The plan's tasks are global; per-mentee completion is via tasks.is_completed which
  // is currently shared. This roster surfaces the plan's overall progress AS-OF now,
  // attributed to each enrolled mentee for visibility. (Per-mentee task state would
  // require a join table — out of scope for this iteration.)
  const { data: phases } = await supabase
    .from("phases")
    .select("id")
    .eq("plan_id", planId);
  const phaseIds = (phases ?? []).map((p) => p.id);

  let total = 0;
  let completed = 0;
  let lastActivity: string | null = null;
  if (phaseIds.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("is_completed, completed_at")
      .in("phase_id", phaseIds);
    total = tasks?.length ?? 0;
    completed = (tasks ?? []).filter((t) => t.is_completed).length;
    for (const t of tasks ?? []) {
      if (t.completed_at && (!lastActivity || t.completed_at > lastActivity)) {
        lastActivity = t.completed_at;
      }
    }
  }

  const rows: MenteeRosterRow[] = assignments.map((a) => {
    const m = Array.isArray(a.mentee) ? a.mentee[0] : a.mentee;
    return {
      mentee_id: a.mentee_id,
      name: m?.name ?? "—",
      avatar_url: m?.avatar_url ?? null,
      assigned_at: a.assigned_at,
      completed,
      total,
      last_activity: lastActivity,
    };
  });

  return { rows, error: null };
}

export async function listMentorPlansWithCounts(
  supabase: SupabaseClient,
  mentorId: string
): Promise<{ plans: MentorPlanCounts[]; error: string | null }> {
  const { data: plans, error } = await supabase
    .from("plans")
    .select("*")
    .eq("created_by", mentorId)
    .order("created_at", { ascending: false });

  if (error) return { plans: [], error: error.message };
  const planIds = (plans ?? []).map((p) => p.id);
  if (planIds.length === 0) return { plans: [], error: null };

  const [{ data: assignments }, { data: requests }] = await Promise.all([
    supabase.from("plan_assignments").select("plan_id").in("plan_id", planIds),
    supabase
      .from("plan_access_requests")
      .select("plan_id, status")
      .in("plan_id", planIds)
      .eq("status", "pending"),
  ]);

  const menteeMap = new Map<string, number>();
  for (const a of assignments ?? [])
    menteeMap.set(a.plan_id, (menteeMap.get(a.plan_id) ?? 0) + 1);
  const reqMap = new Map<string, number>();
  for (const r of requests ?? [])
    reqMap.set(r.plan_id, (reqMap.get(r.plan_id) ?? 0) + 1);

  return {
    plans: (plans as Plan[]).map((p) => ({
      ...p,
      mentee_count: menteeMap.get(p.id) ?? 0,
      pending_request_count: reqMap.get(p.id) ?? 0,
    })),
    error: null,
  };
}
