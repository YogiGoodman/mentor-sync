"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Task,
  TaskProgress,
  Phase,
  TaskWithCommentCount,
} from "@/lib/types/database";

const EMPTY_PROGRESS = {
  is_completed: false,
  is_blocked: false,
  completed_at: null as string | null,
};

/**
 * Loads a plan's template tasks and merges the per-mentee progress overlay
 * (`task_progress`) for `menteeId`. When `menteeId` is null (e.g. a mentor
 * viewing the plan template without selecting a mentee), tasks render with
 * empty progress and toggles are no-ops.
 */
export function useRealtimeTasks(
  phaseIds: string[],
  menteeId: string | null
) {
  const [tasks, setTasks] = useState<TaskWithCommentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchTasks = useCallback(async () => {
    if (phaseIds.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .in("phase_id", phaseIds)
      .order("week_number")
      .order("sort_order");

    if (!tasksData) {
      setLoading(false);
      return;
    }

    const taskIds = (tasksData as Task[]).map((t) => t.id);

    // Per-mentee progress overlay + comment counts, each a single query
    // scoped to the active mentee thread (avoids N+1 per task).
    const [{ data: progressRows }, { data: commentRows }] = await Promise.all([
      menteeId && taskIds.length
        ? supabase
            .from("task_progress")
            .select("task_id, is_completed, is_blocked, completed_at")
            .eq("mentee_id", menteeId)
            .in("task_id", taskIds)
        : Promise.resolve({ data: [] as Partial<TaskProgress>[] }),
      menteeId && taskIds.length
        ? supabase
            .from("comments")
            .select("task_id")
            .eq("mentee_id", menteeId)
            .in("task_id", taskIds)
        : Promise.resolve({ data: [] as { task_id: string }[] }),
    ]);

    const progressMap = new Map<string, Partial<TaskProgress>>();
    for (const p of progressRows ?? []) {
      if (p.task_id) progressMap.set(p.task_id, p);
    }
    const countMap = new Map<string, number>();
    for (const c of commentRows ?? []) {
      countMap.set(c.task_id, (countMap.get(c.task_id) ?? 0) + 1);
    }

    const merged: TaskWithCommentCount[] = (tasksData as Task[]).map((t) => {
      const p = progressMap.get(t.id);
      return {
        ...t,
        is_completed: p?.is_completed ?? EMPTY_PROGRESS.is_completed,
        is_blocked: p?.is_blocked ?? EMPTY_PROGRESS.is_blocked,
        completed_at: p?.completed_at ?? EMPTY_PROGRESS.completed_at,
        comment_count: countMap.get(t.id) ?? 0,
      };
    });

    setTasks(merged);
    setLoading(false);
  }, [phaseIds, menteeId, supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Realtime: template task structure (mentor edits) + this mentee's progress.
  useEffect(() => {
    if (phaseIds.length === 0) return;

    const channel = supabase.channel(
      `tasks:${phaseIds[0]}:${menteeId ?? "template"}`
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      (payload) => {
        if (payload.eventType === "INSERT") {
          const inserted = payload.new as Task;
          if (phaseIds.includes(inserted.phase_id)) {
            setTasks((prev) => [
              ...prev,
              { ...inserted, ...EMPTY_PROGRESS, comment_count: 0 },
            ]);
          }
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as Task;
          setTasks((prev) =>
            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
          );
        } else if (payload.eventType === "DELETE") {
          const deleted = payload.old as { id: string };
          setTasks((prev) => prev.filter((t) => t.id !== deleted.id));
        }
      }
    );

    if (menteeId) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_progress",
          filter: `mentee_id=eq.${menteeId}`,
        },
        (payload) => {
          const row = payload.new as TaskProgress;
          if (!row?.task_id) return;
          setTasks((prev) =>
            prev.map((t) =>
              t.id === row.task_id
                ? {
                    ...t,
                    is_completed: row.is_completed,
                    is_blocked: row.is_blocked,
                    completed_at: row.completed_at,
                  }
                : t
            )
          );
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [phaseIds, menteeId, supabase]);

  const upsertProgress = useCallback(
    async (
      taskId: string,
      patch: { is_completed?: boolean; is_blocked?: boolean; completed_at?: string | null }
    ) => {
      if (!menteeId) return;
      const task = tasks.find((t) => t.id === taskId);
      const { error } = await supabase.from("task_progress").upsert(
        {
          task_id: taskId,
          mentee_id: menteeId,
          is_completed: patch.is_completed ?? task?.is_completed ?? false,
          is_blocked: patch.is_blocked ?? task?.is_blocked ?? false,
          completed_at:
            patch.completed_at !== undefined
              ? patch.completed_at
              : task?.completed_at ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "task_id,mentee_id" }
      );
      return error;
    },
    [menteeId, supabase, tasks]
  );

  const toggleComplete = async (taskId: string) => {
    if (!menteeId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newCompleted = !task.is_completed;
    const newCompletedAt = newCompleted ? new Date().toISOString() : null;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, is_completed: newCompleted, completed_at: newCompletedAt }
          : t
      )
    );

    const error = await upsertProgress(taskId, {
      is_completed: newCompleted,
      completed_at: newCompletedAt,
    });

    if (error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, is_completed: task.is_completed, completed_at: task.completed_at }
            : t
        )
      );
    }
  };

  const toggleBlocked = async (taskId: string) => {
    if (!menteeId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newBlocked = !task.is_blocked;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_blocked: newBlocked } : t))
    );

    const error = await upsertProgress(taskId, { is_blocked: newBlocked });

    if (error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, is_blocked: task.is_blocked } : t
        )
      );
    }
  };

  return { tasks, loading, toggleComplete, toggleBlocked, refetch: fetchTasks };
}

export function getTasksByPhaseAndWeek(
  tasks: TaskWithCommentCount[],
  phases: Phase[]
) {
  const grouped: Record<
    string,
    Record<number, TaskWithCommentCount[]>
  > = {};

  for (const phase of phases) {
    grouped[phase.id] = {};
    const phaseTasks = tasks.filter((t) => t.phase_id === phase.id);
    for (const task of phaseTasks) {
      if (!grouped[phase.id][task.week_number]) {
        grouped[phase.id][task.week_number] = [];
      }
      grouped[phase.id][task.week_number].push(task);
    }
  }

  return grouped;
}
