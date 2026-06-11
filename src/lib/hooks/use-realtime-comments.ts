"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Comment } from "@/lib/types/database";

export function useRealtimeComments(
  taskId: string | null,
  menteeId: string | null
) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const fetchComments = useCallback(async () => {
    if (!taskId || !menteeId) {
      setComments([]);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("*, profiles:profiles!user_id(name, role)")
      .eq("task_id", taskId)
      .eq("mentee_id", menteeId)
      .order("created_at", { ascending: true });

    setComments((data as Comment[]) ?? []);
    setLoading(false);
  }, [taskId, menteeId, supabase]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (!taskId || !menteeId) return;

    const channel = supabase
      .channel(`comments:${taskId}:${menteeId}`)
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
          // Keep only this mentee's thread for the task.
          if (newComment.mentee_id !== menteeId) return;
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
  }, [taskId, menteeId, supabase]);

  const addComment = async (content: string, userId: string) => {
    if (!taskId || !menteeId) return;

    const { error } = await supabase.from("comments").insert({
      task_id: taskId,
      mentee_id: menteeId,
      user_id: userId,
      content,
    });

    return { error };
  };

  return { comments, loading, addComment };
}
