"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PlanMessage } from "@/lib/types/database";
import { extractMentionTaskIds } from "@/lib/mentions";

const PAGE_SIZE = 30;

export function useRealtimePlanChat(
  planId: string | null,
  menteeId: string | null
) {
  const [messages, setMessages] = useState<PlanMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const initialLoadDone = useRef(false);

  const fetchMessages = useCallback(async () => {
    if (!planId || !menteeId) {
      setMessages([]);
      setHasMore(false);
      return;
    }

    setLoading(true);
    const { data, count } = await supabase
      .from("plan_messages")
      .select("*, profiles(name, role)", { count: "exact" })
      .eq("plan_id", planId)
      .eq("mentee_id", menteeId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    const msgs = ((data as PlanMessage[]) ?? []).reverse();
    setMessages(msgs);
    setHasMore((count ?? 0) > PAGE_SIZE);
    setLoading(false);
    initialLoadDone.current = true;
  }, [planId, menteeId, supabase]);

  const loadOlder = useCallback(async () => {
    if (!planId || !menteeId || loadingMore || !hasMore || messages.length === 0)
      return;

    setLoadingMore(true);
    const oldest = messages[0];
    const { data } = await supabase
      .from("plan_messages")
      .select("*, profiles(name, role)", { count: "exact" })
      .eq("plan_id", planId)
      .eq("mentee_id", menteeId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    const older = ((data as PlanMessage[]) ?? []).reverse();
    setMessages((prev) => [...older, ...prev]);
    setHasMore(older.length >= PAGE_SIZE);
    setLoadingMore(false);
  }, [planId, menteeId, loadingMore, hasMore, messages, supabase]);

  useEffect(() => {
    initialLoadDone.current = false;
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!planId || !menteeId) return;

    const channel = supabase
      .channel(`plan-chat:${planId}:${menteeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "plan_messages",
          filter: `mentee_id=eq.${menteeId}`,
        },
        async (payload) => {
          const newMsg = payload.new as PlanMessage;
          // mentee_id alone spans the mentee's plans — keep only this thread.
          if (newMsg.plan_id !== planId) return;
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, role")
            .eq("id", newMsg.user_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMsg, profiles: profile ?? undefined },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId, menteeId, supabase]);

  const sendMessage = async (content: string, userId: string) => {
    if (!planId || !menteeId) return;

    const mentionTaskIds = extractMentionTaskIds(content);

    const { error } = await supabase.from("plan_messages").insert({
      plan_id: planId,
      mentee_id: menteeId,
      user_id: userId,
      content,
      mention_task_ids: mentionTaskIds,
    });

    return { error };
  };

  return { messages, loading, hasMore, loadingMore, loadOlder, sendMessage };
}
