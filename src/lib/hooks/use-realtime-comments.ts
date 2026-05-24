"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Comment } from "@/lib/types/database";

export function useRealtimeComments(taskId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const fetchComments = useCallback(async () => {
    if (!taskId) {
      setComments([]);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(name, role)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    setComments((data as Comment[]) ?? []);
    setLoading(false);
  }, [taskId, supabase]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`comments:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          const newComment = payload.new as Comment;
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, role")
            .eq("id", newComment.user_id)
            .single();

          const commentWithProfile: Comment = {
            ...newComment,
            profiles: profile ?? undefined,
          };
          setComments((prev) => [...prev, commentWithProfile]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, supabase]);

  const addComment = async (content: string, userId: string) => {
    if (!taskId) return;

    const { error } = await supabase.from("comments").insert({
      task_id: taskId,
      user_id: userId,
      content,
    });

    return { error };
  };

  return { comments, loading, addComment };
}
