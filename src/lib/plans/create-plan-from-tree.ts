import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanTree } from "@/lib/types/database";

export interface CreatePlanResult {
  planId: string | null;
  error: string | null;
}

/**
 * Insert a plan + phases + tasks under the given creator.
 * Caller is responsible for authn/authz (role check) before calling.
 * `client` should be a service-role client when bypassing RLS is intended,
 * or a session client when relying on RLS (mentor-owned plans only).
 */
export async function createPlanFromTree(
  client: SupabaseClient,
  tree: PlanTree,
  createdBy: string
): Promise<CreatePlanResult> {
  const { data: plan, error: planError } = await client
    .from("plans")
    .insert({
      title: tree.title,
      description: tree.description,
      total_weeks: tree.total_weeks,
      start_date: tree.start_date ?? null,
      created_by: createdBy,
    })
    .select()
    .single();

  if (planError || !plan) {
    return { planId: null, error: planError?.message ?? "Failed to create plan" };
  }

  for (const phaseData of tree.phases) {
    const { data: phase, error: phaseError } = await client
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

    if (phaseData.tasks.length > 0) {
      await client.from("tasks").insert(
        phaseData.tasks.map((t) => ({
          phase_id: phase.id,
          week_number: t.week_number,
          title: t.title,
          task_type: t.task_type,
          sort_order: t.sort_order,
        }))
      );
    }
  }

  return { planId: plan.id, error: null };
}
