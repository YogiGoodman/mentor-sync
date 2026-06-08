import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, Role } from "@/lib/types/database";
import { getCurrentWeek, parseTimestamp } from "@/lib/heatmap";
import { expectedByNow } from "@/lib/momentum";

const STALL_DAYS = 7;

export interface MenteeRosterRow {
  mentee_id: string;
  name: string;
  avatar_url: string | null;
  assigned_at: string;
  completed: number;
  total: number;
  last_activity: string | null;
  blockers: number;
  /** Days since last completion; null if the mentee has never completed a task. */
  stalled_days: number | null;
  /** Completed fewer tasks than the prorated schedule expects by now. */
  behind: boolean;
  at_risk: boolean;
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

  // Real per-mentee aggregate: the plan's tasks are a shared template (total);
  // each mentee's completion lives in the task_progress overlay.
  const [{ data: plan }, { data: phases }] = await Promise.all([
    supabase
      .from("plans")
      .select("start_date, total_weeks")
      .eq("id", planId)
      .maybeSingle(),
    supabase.from("phases").select("id").eq("plan_id", planId),
  ]);
  const phaseIds = (phases ?? []).map((p) => p.id);

  let total = 0;
  const completedByMentee = new Map<string, number>();
  const blockedByMentee = new Map<string, number>();
  const lastActivityByMentee = new Map<string, string>();

  if (phaseIds.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id")
      .in("phase_id", phaseIds);
    const taskIds = (tasks ?? []).map((t) => t.id);
    total = taskIds.length;

    if (taskIds.length > 0) {
      const { data: progress } = await supabase
        .from("task_progress")
        .select("mentee_id, is_completed, is_blocked, completed_at")
        .in("task_id", taskIds);

      for (const p of progress ?? []) {
        if (p.is_completed) {
          completedByMentee.set(
            p.mentee_id,
            (completedByMentee.get(p.mentee_id) ?? 0) + 1
          );
        }
        if (p.is_blocked) {
          blockedByMentee.set(
            p.mentee_id,
            (blockedByMentee.get(p.mentee_id) ?? 0) + 1
          );
        }
        if (p.completed_at) {
          const cur = lastActivityByMentee.get(p.mentee_id);
          if (!cur || p.completed_at > cur) {
            lastActivityByMentee.set(p.mentee_id, p.completed_at);
          }
        }
      }
    }
  }

  const currentWeek = getCurrentWeek(
    plan?.start_date ?? null,
    plan?.total_weeks ?? 0
  );
  const expected = expectedByNow(total, currentWeek, plan?.total_weeks ?? 0);
  const now = Date.now();

  const rows: MenteeRosterRow[] = assignments.map((a) => {
    const m = Array.isArray(a.mentee) ? a.mentee[0] : a.mentee;
    const completed = completedByMentee.get(a.mentee_id) ?? 0;
    const blockers = blockedByMentee.get(a.mentee_id) ?? 0;
    const lastActivity = lastActivityByMentee.get(a.mentee_id) ?? null;
    const stalledDays = lastActivity
      ? Math.floor((now - parseTimestamp(lastActivity).getTime()) / 86400000)
      : null;
    const behind = currentWeek !== null && completed < expected;
    const stalled =
      currentWeek !== null &&
      (stalledDays === null || stalledDays >= STALL_DAYS);
    const at_risk = blockers > 0 || behind || stalled;

    return {
      mentee_id: a.mentee_id,
      name: m?.name ?? "—",
      avatar_url: m?.avatar_url ?? null,
      assigned_at: a.assigned_at,
      completed,
      total,
      last_activity: lastActivity,
      blockers,
      stalled_days: stalledDays,
      behind,
      at_risk,
    };
  });

  // Surface at-risk mentees first.
  rows.sort((a, b) => Number(b.at_risk) - Number(a.at_risk));

  return { rows, error: null };
}

export interface AtRiskMentee extends MenteeRosterRow {
  plan_id: string;
  plan_title: string;
}

/** Flatten at-risk mentees across a mentor's plans, most-at-risk first. */
export async function listAtRiskMentees(
  supabase: SupabaseClient,
  plans: { id: string; title: string }[]
): Promise<AtRiskMentee[]> {
  const perPlan = await Promise.all(
    plans.map(async (p) => {
      const { rows } = await listMenteesForPlan(supabase, p.id);
      return rows
        .filter((r) => r.at_risk)
        .map((r) => ({ ...r, plan_id: p.id, plan_title: p.title }));
    })
  );

  const score = (r: AtRiskMentee) =>
    (r.behind ? 1 : 0) +
    (r.blockers > 0 ? 1 : 0) +
    (r.stalled_days !== null && r.stalled_days >= STALL_DAYS ? 1 : 0);

  return perPlan.flat().sort((a, b) => score(b) - score(a));
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
