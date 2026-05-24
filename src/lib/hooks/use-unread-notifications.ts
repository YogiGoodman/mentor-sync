"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchUnreadCounts,
  type UnreadCounts,
} from "@/lib/queries/notifications";

const EMPTY: UnreadCounts = {
  totalComments: 0,
  totalMessages: 0,
  total: 0,
  byPlan: {},
  byTask: {},
  byTaskMeta: {},
};

export function useUnreadNotifications(userId: string, role: string) {
  const [counts, setCounts] = useState<UnreadCounts>(EMPTY);
  // Memoize so the realtime channel isn't torn down + rebuilt every render,
  // which caused mentor notifications to arrive only after a manual refresh.
  const supabase = useMemo(() => createClient(), []);

  const refresh = useCallback(async () => {
    let planIds: string[] = [];

    if (role === "mentor") {
      const { data } = await supabase
        .from("plans")
        .select("id")
        .eq("created_by", userId);
      planIds = (data ?? []).map((p) => p.id);
    } else {
      const { data } = await supabase
        .from("plan_assignments")
        .select("plan_id")
        .eq("mentee_id", userId);
      planIds = (data ?? []).map((a) => a.plan_id);
    }

    if (planIds.length === 0) {
      setCounts(EMPTY);
      return;
    }

    const result = await fetchUnreadCounts(supabase, userId, planIds);
    setCounts(result);
  }, [userId, role, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const channel = supabase
      .channel("unread-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload) => {
          const c = payload.new as { user_id: string };
          if (c.user_id !== userId) refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "plan_messages" },
        (payload) => {
          const m = payload.new as { user_id: string };
          if (m.user_id !== userId) refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "plan_chat_reads",
          filter: `user_id=eq.${userId}`,
        },
        () => refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_comment_reads",
          filter: `user_id=eq.${userId}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, refresh]);

  return { counts, refresh };
}
