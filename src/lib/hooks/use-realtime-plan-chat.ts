"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PlanMessage } from "@/lib/types/database";
import { extractMentionTaskIds } from "@/lib/mentions";

const PAGE_SIZE = 30;

export function useRealtimePlanChat(planId: string | null) {
  const [messages, setMessages] = useState<PlanMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const supabase = createClient();
  const initialLoadDone = useRef(false);

  const fetchMessages = useCallback(async () => {
    if (!planId) {
      setMessages([]);
      setHasMore(false);
      return;
    }

    setLoading(true);
    const { data, count } = await supabase
      .from("plan_messages")
      .select("*, profiles(name, role)", { count: "exact" })
      .eq("plan_id", planId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    const msgs = ((data as PlanMessage[]) ?? []).reverse();
    setMessages(msgs);
    setHasMore((count ?? 0) > PAGE_SIZE);
    setLoading(false);
    initialLoadDone.current = true;
  }, [planId, supabase]);

  const loadOlder = useCallback(async () => {
    if (!planId || loadingMore || !hasMore || messages.length === 0) return;

    setLoadingMore(true);
    const oldest = messages[0];
    const { data, count } = await supabase
      .from("plan_messages")
      .select("*, profiles(name, role)", { count: "exact" })
      .eq("plan_id", planId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    const older = ((data as PlanMessage[]) ?? []).reverse();
    setMessages((prev) => [...older, ...prev]);
    setHasMore(older.length >= PAGE_SIZE);
    setLoadingMore(false);
  }, [planId, loadingMore, hasMore, messages, supabase]);

  useEffect(() => {
    initialLoadDone.current = false;
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!planId) return;

    const channel = supabase
      .channel(`plan-chat:${planId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "plan_messages",
          filter: `plan_id=eq.${planId}`,
        },
        async (payload) => {
          const newMsg = payload.new as PlanMessage;
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
  }, [planId, supabase]);

  const sendMessage = async (content: string, userId: string) => {
    if (!planId) return;

    const mentionTaskIds = extractMentionTaskIds(content);

    const { error } = await supabase.from("plan_messages").insert({
      plan_id: planId,
      user_id: userId,
      content,
      mention_task_ids: mentionTaskIds,
    });

    return { error };
  };

  return { messages, loading, hasMore, loadingMore, loadOlder, sendMessage };
}
