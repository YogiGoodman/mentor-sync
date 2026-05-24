import type { SupabaseClient } from "@supabase/supabase-js";

export async function markTaskCommentsRead(
  supabase: SupabaseClient,
  userId: string,
  taskId: string
) {
  await supabase.from("task_comment_reads").upsert(
    { user_id: userId, task_id: taskId, last_read_at: new Date().toISOString() },
    { onConflict: "user_id,task_id" }
  );
}

export async function markPlanChatRead(
  supabase: SupabaseClient,
  userId: string,
  planId: string
) {
  await supabase.from("plan_chat_reads").upsert(
    { user_id: userId, plan_id: planId, last_read_at: new Date().toISOString() },
    { onConflict: "user_id,plan_id" }
  );
}

export interface UnreadCounts {
  totalComments: number;
  totalMessages: number;
  total: number;
  byPlan: Record<string, { comments: number; messages: number; planTitle: string }>;
  byTask: Record<string, number>;
  byTaskMeta: Record<string, { planId: string; taskTitle: string; planTitle: string }>;
}

export async function fetchUnreadCounts(
  supabase: SupabaseClient,
  userId: string,
  planIds: string[]
): Promise<UnreadCounts> {
  if (planIds.length === 0) {
    return {
      totalComments: 0,
      totalMessages: 0,
      total: 0,
      byPlan: {},
      byTask: {},
      byTaskMeta: {},
    };
  }

  const [
    { data: chatReads },
    { data: taskReads },
    { data: planMessages },
    { data: phases },
    { data: plans },
  ] = await Promise.all([
    supabase
      .from("plan_chat_reads")
      .select("plan_id, last_read_at")
      .eq("user_id", userId)
      .in("plan_id", planIds),
    supabase
      .from("task_comment_reads")
      .select("task_id, last_read_at")
      .eq("user_id", userId),
    supabase
      .from("plan_messages")
      .select("id, plan_id, user_id, created_at")
      .in("plan_id", planIds)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("phases")
      .select("id, plan_id")
      .in("plan_id", planIds),
    supabase
      .from("plans")
      .select("id, title")
      .in("id", planIds),
  ]);

  const planTitleMap: Record<string, string> = {};
  for (const p of plans ?? []) {
    planTitleMap[p.id] = p.title;
  }

  const chatReadMap: Record<string, string> = {};
  for (const r of chatReads ?? []) {
    chatReadMap[r.plan_id] = r.last_read_at;
  }

  const taskReadMap: Record<string, string> = {};
  for (const r of taskReads ?? []) {
    taskReadMap[r.task_id] = r.last_read_at;
  }

  // Count unread plan messages
  const byPlan: Record<
    string,
    { comments: number; messages: number; planTitle: string }
  > = {};
  let totalMessages = 0;

  for (const planId of planIds) {
    byPlan[planId] = {
      comments: 0,
      messages: 0,
      planTitle: planTitleMap[planId] ?? "Plan",
    };
  }

  for (const msg of planMessages ?? []) {
    const lastRead = chatReadMap[msg.plan_id];
    if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
      if (byPlan[msg.plan_id]) {
        byPlan[msg.plan_id].messages++;
      }
      totalMessages++;
    }
  }

  // Count unread task comments per plan
  const phaseIds = (phases ?? []).map((p) => p.id);
  const phasePlanMap: Record<string, string> = {};
  for (const p of phases ?? []) {
    phasePlanMap[p.id] = p.plan_id;
  }

  let totalComments = 0;
  const byTask: Record<string, number> = {};
  const byTaskMeta: Record<
    string,
    { planId: string; taskTitle: string; planTitle: string }
  > = {};

  if (phaseIds.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, phase_id, title")
      .in("phase_id", phaseIds);

    const taskIds = (tasks ?? []).map((t) => t.id);
    const taskPhaseMap: Record<string, string> = {};
    const taskTitleMap: Record<string, string> = {};
    for (const t of tasks ?? []) {
      taskPhaseMap[t.id] = t.phase_id;
      taskTitleMap[t.id] = t.title;
    }

    if (taskIds.length > 0) {
      const { data: comments } = await supabase
        .from("comments")
        .select("id, task_id, user_id, created_at")
        .in("task_id", taskIds)
        .neq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1000);

      for (const c of comments ?? []) {
        const lastRead = taskReadMap[c.task_id];
        if (!lastRead || new Date(c.created_at) > new Date(lastRead)) {
          byTask[c.task_id] = (byTask[c.task_id] || 0) + 1;
          totalComments++;

          const phaseId = taskPhaseMap[c.task_id];
          const planId = phaseId ? phasePlanMap[phaseId] : null;
          if (planId && byPlan[planId]) {
            byPlan[planId].comments++;
            byTaskMeta[c.task_id] = {
              planId,
              taskTitle: taskTitleMap[c.task_id] ?? "Task",
              planTitle: planTitleMap[planId] ?? "Plan",
            };
          }
        }
      }
    }
  }

  return {
    totalComments,
    totalMessages,
    total: totalComments + totalMessages,
    byPlan,
    byTask,
    byTaskMeta,
  };
}
