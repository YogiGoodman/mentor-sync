"use client";

import { useState, useRef, useEffect } from "react";
import { Sheet } from "@/components/ui/sheet";
import { useRealtimeComments } from "@/lib/hooks/use-realtime-comments";
import { markTaskCommentsRead } from "@/lib/queries/notifications";
import { useNotifications } from "@/lib/hooks/notifications-context";
import { createClient } from "@/lib/supabase/client";
import { Send } from "lucide-react";
import type { TaskWithCommentCount } from "@/lib/types/database";

interface CommentPanelProps {
  task: TaskWithCommentCount | null;
  userId: string;
  open: boolean;
  onClose: () => void;
}

export function CommentPanel({ task, userId, open, onClose }: CommentPanelProps) {
  const { comments, loading, addComment } = useRealtimeComments(
    task?.id ?? null
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
    if (open && task?.id) {
      markTaskCommentsRead(supabase, userId, task.id).then(() =>
        notif?.refresh()
      );
    }
  }, [open, task?.id, userId, supabase, notif]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    await addComment(message.trim(), userId);
    if (task?.id) {
      await markTaskCommentsRead(supabase, userId, task.id);
      notif?.refresh();
    }
    setMessage("");
    setSending(false);
  }

  return (
    <Sheet open={open} onClose={onClose} title={task?.title ?? "Comments"}>
      <div className="flex h-full flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">
                No comments yet. Start the conversation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const isOwn = comment.user_id === userId;
                const profile = comment.profiles;
                return (
                  <div
                    key={comment.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3.5 py-2.5 ${
                        isOwn
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {!isOwn && profile && (
                        <p className="mb-1 text-xs font-medium text-slate-500">
                          {profile.name}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {new Date(comment.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200 px-6 py-4"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="rounded-lg bg-slate-900 p-2 text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </Sheet>
  );
}
