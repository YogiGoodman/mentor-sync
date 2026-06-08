import type { SupabaseClient } from "@supabase/supabase-js";

export async function markTaskCommentsRead(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  menteeId: string
) {
  await supabase.from("task_comment_reads").upsert(
    {
      user_id: userId,
      task_id: taskId,
      mentee_id: menteeId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "user_id,task_id,mentee_id" }
  );
}

export async function markPlanChatRead(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
  menteeId: string
) {
  await supabase.from("plan_chat_reads").upsert(
    {
      user_id: userId,
      plan_id: planId,
      mentee_id: menteeId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "user_id,plan_id,mentee_id" }
  );
}

// A conversation is keyed by (plan, mentee). For a mentee, menteeId === their
// own id; for a mentor, there is one thread per enrolled mentee. `menteeName`
// is set only when the viewer is a mentor (so the UI can disambiguate).
export interface ChatThreadUnread {
  planId: string;
  menteeId: string;
  planTitle: string;
  menteeName: string | null;
  messages: number;
}

export interface TaskThreadUnread {
  planId: string;
  menteeId: string;
  taskId: string;
  taskTitle: string;
  planTitle: string;
  menteeName: string | null;
  count: number;
}

export interface UnreadCounts {
  totalComments: number;
  totalMessages: number;
  total: number;
  // keyed `${planId}:${menteeId}`
  chatThreads: Record<string, ChatThreadUnread>;
  // keyed `${taskId}:${menteeId}`
  taskThreads: Record<string, TaskThreadUnread>;
}

export function emptyUnreadCounts(): UnreadCounts {
  return {
    totalComments: 0,
    totalMessages: 0,
    total: 0,
    chatThreads: {},
    taskThreads: {},
  };
}

export async function fetchUnreadCounts(
  supabase: SupabaseClient,
  userId: string,
  planIds: string[]
): Promise<UnreadCounts> {
  if (planIds.length === 0) return emptyUnreadCounts();

  const [
    { data: chatReads },
    { data: taskReads },
    { data: planMessages },
    { data: phases },
    { data: plans },
  ] = await Promise.all([
    supabase
      .from("plan_chat_reads")
      .select("plan_id, mentee_id, last_read_at")
      .eq("user_id", userId)
      .in("plan_id", planIds),
    supabase
      .from("task_comment_reads")
      .select("task_id, mentee_id, last_read_at")
      .eq("user_id", userId),
    supabase
      .from("plan_messages")
      .select("id, plan_id, mentee_id, user_id, created_at")
      .in("plan_id", planIds)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("phases").select("id, plan_id").in("plan_id", planIds),
    supabase.from("plans").select("id, title").in("id", planIds),
  ]);

  const planTitleMap: Record<string, string> = {};
  for (const p of plans ?? []) planTitleMap[p.id] = p.title;

  // Read cursors keyed by thread.
  const chatReadMap = new Map<string, string>();
  for (const r of chatReads ?? [])
    chatReadMap.set(`${r.plan_id}:${r.mentee_id}`, r.last_read_at);
  const taskReadMap = new Map<string, string>();
  for (const r of taskReads ?? [])
    taskReadMap.set(`${r.task_id}:${r.mentee_id}`, r.last_read_at);

  // Resolve mentee display names for threads the viewer doesn't own.
  const menteeIds = new Set<string>();
  for (const m of planMessages ?? [])
    if (m.mentee_id !== userId) menteeIds.add(m.mentee_id);

  const chatThreads: Record<string, ChatThreadUnread> = {};
  let totalMessages = 0;

  for (const msg of planMessages ?? []) {
    const key = `${msg.plan_id}:${msg.mentee_id}`;
    const lastRead = chatReadMap.get(key);
    if (lastRead && new Date(msg.created_at) <= new Date(lastRead)) continue;
    if (!chatThreads[key]) {
      chatThreads[key] = {
        planId: msg.plan_id,
        menteeId: msg.mentee_id,
        planTitle: planTitleMap[msg.plan_id] ?? "Plan",
        menteeName: null,
        messages: 0,
      };
    }
    chatThreads[key].messages++;
    totalMessages++;
  }

  // Unread task comments, scoped per (task, mentee) thread.
  const phaseIds = (phases ?? []).map((p) => p.id);
  const phasePlanMap: Record<string, string> = {};
  for (const p of phases ?? []) phasePlanMap[p.id] = p.plan_id;

  let totalComments = 0;
  const taskThreads: Record<string, TaskThreadUnread> = {};

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
        .select("id, task_id, mentee_id, user_id, created_at")
        .in("task_id", taskIds)
        .neq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1000);

      for (const c of comments ?? []) {
        const key = `${c.task_id}:${c.mentee_id}`;
        const lastRead = taskReadMap.get(key);
        if (lastRead && new Date(c.created_at) <= new Date(lastRead)) continue;
        if (c.mentee_id !== userId) menteeIds.add(c.mentee_id);

        const phaseId = taskPhaseMap[c.task_id];
        const planId = phaseId ? phasePlanMap[phaseId] : null;
        if (!planId) continue;

        if (!taskThreads[key]) {
          taskThreads[key] = {
            planId,
            menteeId: c.mentee_id,
            taskId: c.task_id,
            taskTitle: taskTitleMap[c.task_id] ?? "Task",
            planTitle: planTitleMap[planId] ?? "Plan",
            menteeName: null,
            count: 0,
          };
        }
        taskThreads[key].count++;
        totalComments++;
      }
    }
  }

  // Attach mentee names (mentor view).
  if (menteeIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", Array.from(menteeIds));
    const nameMap = new Map<string, string>();
    for (const p of profiles ?? []) nameMap.set(p.id, p.name);
    for (const t of Object.values(chatThreads))
      if (t.menteeId !== userId) t.menteeName = nameMap.get(t.menteeId) ?? null;
    for (const t of Object.values(taskThreads))
      if (t.menteeId !== userId) t.menteeName = nameMap.get(t.menteeId) ?? null;
  }

  return {
    totalComments,
    totalMessages,
    total: totalComments + totalMessages,
    chatThreads,
    taskThreads,
  };
}
