"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, Phase, TaskWithCommentCount } from "@/lib/types/database";

export function useRealtimeTasks(phaseIds: string[]) {
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

    const tasksWithCounts = await Promise.all(
      tasksData.map(async (task) => {
        const { count } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("task_id", task.id);
        return { ...task, comment_count: count ?? 0 } as TaskWithCommentCount;
      })
    );

    setTasks(tasksWithCounts);
    setLoading(false);
  }, [phaseIds, supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (phaseIds.length === 0) return;

    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as Task;
            setTasks((prev) =>
              prev.map((t) =>
                t.id === updated.id
                  ? { ...t, ...updated }
                  : t
              )
            );
          } else if (payload.eventType === "INSERT") {
            const inserted = payload.new as Task;
            if (phaseIds.includes(inserted.phase_id)) {
              setTasks((prev) => [
                ...prev,
                { ...inserted, comment_count: 0 },
              ]);
            }
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setTasks((prev) => prev.filter((t) => t.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [phaseIds, supabase]);

  const toggleComplete = async (taskId: string) => {
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

    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: newCompleted, completed_at: newCompletedAt })
      .eq("id", taskId);

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
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, is_blocked: !t.is_blocked } : t
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({ is_blocked: !task.is_blocked })
      .eq("id", taskId);

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
