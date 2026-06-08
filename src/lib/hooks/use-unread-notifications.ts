"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchUnreadCounts,
  emptyUnreadCounts,
  type UnreadCounts,
} from "@/lib/queries/notifications";

const EMPTY = emptyUnreadCounts();

export function useUnreadNotifications(userId: string, role: string) {
  const [counts, setCounts] = useState<UnreadCounts>(EMPTY);
  // Memoize so the realtime channel isn't torn down + rebuilt every render,
  // which caused mentor notifications to arrive only after a manual refresh.
  const supabase = useMemo(() => createClient(), []);
  // Tracks which plan's chat panel is currently open and visible. Messages
  // from that plan should not trigger a refresh — the panel marks them read
  // in real time, so refreshing would cause a visible counter flicker.
  const activeChatThreadRef = useRef<string | null>(null);
  const setActiveChatThread = useCallback((threadKey: string | null) => {
    activeChatThreadRef.current = threadKey;
  }, []);

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
          const m = payload.new as {
            user_id: string;
            plan_id: string;
            mentee_id: string;
          };
          // Skip refresh if this message belongs to the (plan, mentee) thread
          // whose chat is currently open — the panel marks it read immediately,
          // so refreshing would cause a counter flicker.
          const key = `${m.plan_id}:${m.mentee_id}`;
          if (m.user_id !== userId && key !== activeChatThreadRef.current) {
            refresh();
          }
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

  return { counts, refresh, setActiveChatThread };
}
