"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useRealtimeComments } from "@/lib/hooks/use-realtime-comments";
import { markTaskCommentsRead } from "@/lib/queries/notifications";
import { useNotifications } from "@/lib/hooks/notifications-context";
import { createClient } from "@/lib/supabase/client";
import { Send, MessageCircle } from "lucide-react";
import type { TaskWithCommentCount } from "@/lib/types/database";

interface CommentPanelProps {
  task: TaskWithCommentCount | null;
  userId: string;
  menteeId: string | null;
  open: boolean;
  onClose: () => void;
}

export function CommentPanel({ task, userId, menteeId, open, onClose }: CommentPanelProps) {
  const { comments, loading, addComment } = useRealtimeComments(
    task?.id ?? null,
    menteeId
  );
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const notif = useNotifications();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  useEffect(() => {
    if (open && task?.id && menteeId) {
      markTaskCommentsRead(supabase, userId, task.id, menteeId).then(() =>
        notif?.refresh()
      );
    }
  }, [open, task?.id, menteeId, userId, supabase, notif]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    await addComment(message.trim(), userId);
    if (task?.id && menteeId) {
      await markTaskCommentsRead(supabase, userId, task.id, menteeId);
      notif?.refresh();
    }
    setMessage("");
    setSending(false);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={task?.title ?? "Comments"}
      subtitle={
        comments.length > 0
          ? `${comments.length} comment${comments.length === 1 ? "" : "s"}`
          : "Discuss this task"
      }
      maxWidthClass="max-w-lg"
    >
      <div className="flex h-[60vh] min-h-[320px] flex-col sm:h-[480px]">
        <div className="flex-1 overflow-y-auto bg-slate-50/40 px-5 py-4 dark:bg-slate-900/40">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600 dark:border-slate-700 dark:border-t-emerald-400" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/15">
                <MessageCircle className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                No comments yet
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Start the conversation about this task.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => {
                const isOwn = comment.user_id === userId;
                const profile = comment.profiles;
                return (
                  <div
                    key={comment.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex max-w-[80%] flex-col">
                      {!isOwn && profile && (
                        <span className="mb-0.5 ml-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          {profile.name}
                        </span>
                      )}
                      <div
                        className={`rounded-2xl px-3.5 py-2 ${
                          isOwn
                            ? "bg-emerald-600 text-white rounded-br-md dark:bg-emerald-500"
                            : "bg-white text-slate-800 ring-1 ring-slate-200 rounded-bl-md dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {comment.content}
                        </p>
                      </div>
                      <span
                        className={`mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 ${isOwn ? "text-right" : "ml-1"}`}
                      >
                        {new Date(comment.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a comment..."
              autoFocus
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-800 dark:focus:ring-emerald-500/20"
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-40 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
