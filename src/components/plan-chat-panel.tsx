"use client";

import { useRef, useEffect, useMemo } from "react";
import { useRealtimePlanChat } from "@/lib/hooks/use-realtime-plan-chat";
import { markPlanChatRead } from "@/lib/queries/notifications";
import { useNotifications } from "@/lib/hooks/notifications-context";
import { createClient } from "@/lib/supabase/client";
import { MentionInput } from "@/components/mention-input";
import { parseMentions } from "@/lib/mentions";
import type { TaskWithCommentCount, PlanMessage } from "@/lib/types/database";
import { X, ChevronUp, MessageSquare, Minus } from "lucide-react";
import Link from "next/link";

interface PlanChatPanelProps {
  planId: string;
  menteeId: string;
  userId: string;
  tasks: TaskWithCommentCount[];
  open: boolean;
  onClose: () => void;
  onMinimize?: () => void;
}

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function groupMessagesByDate(messages: PlanMessage[]) {
  const groups: { date: string; messages: PlanMessage[] }[] = [];
  let currentDate = "";

  for (const msg of messages) {
    const date = new Date(msg.created_at).toISOString().split("T")[0];
    if (date !== currentDate) {
      groups.push({ date, messages: [] });
      currentDate = date;
    }
    groups[groups.length - 1].messages.push(msg);
  }

  return groups;
}

export function PlanChatPanel({
  planId,
  menteeId,
  userId,
  tasks,
  open,
  onClose,
  onMinimize,
}: PlanChatPanelProps) {
  const { messages, loading, hasMore, loadingMore, loadOlder, sendMessage } =
    useRealtimePlanChat(open ? planId : null, menteeId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const notif = useNotifications();
  const prevMsgCount = useRef(0);

  const dateGroups = useMemo(() => groupMessagesByDate(messages), [messages]);

  // Auto-scroll on new messages only
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCount.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (open) {
      notif?.setActiveChatThread(`${planId}:${menteeId}`);
      markPlanChatRead(supabase, userId, planId, menteeId).then(() =>
        notif?.refresh()
      );
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
    } else {
      notif?.setActiveChatThread(null);
    }
  }, [open, planId, menteeId, userId, supabase, notif]);

  async function handleSend(content: string) {
    await sendMessage(content, userId);
    await markPlanChatRead(supabase, userId, planId, menteeId);
    notif?.refresh();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-[400px] max-w-[90vw] flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Plan Chat</h3>
        </div>
        <div className="flex items-center gap-1">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="rounded-md p-1 text-slate-400 hover:text-white transition-colors"
              title="Minimize"
            >
              <Minus className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600 dark:border-slate-700 dark:border-t-emerald-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3 dark:bg-slate-800">
              <MessageSquare className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              No messages yet
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Start a conversation. Use <kbd className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-mono dark:bg-slate-800 dark:text-slate-300">@</kbd> to tag tasks.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Load older */}
            {hasMore && (
              <div className="flex justify-center py-2">
                <button
                  onClick={loadOlder}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {loadingMore ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent dark:border-slate-500" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )}
                  Load earlier messages
                </button>
              </div>
            )}

            {dateGroups.map((group) => (
              <div key={group.date}>
                {/* Day divider */}
                <div className="flex items-center gap-3 py-3">
                  <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {formatDateDivider(group.date)}
                  </span>
                  <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                </div>

                <div className="space-y-2">
                  {group.messages.map((msg) => {
                    const isOwn = msg.user_id === userId;
                    const profile = msg.profiles;
                    const tokens = parseMentions(msg.content);

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div className="flex flex-col max-w-[80%]">
                          {!isOwn && profile && (
                            <span className="mb-0.5 text-[10px] font-medium text-slate-400 ml-1 dark:text-slate-500">
                              {profile.name}
                            </span>
                          )}
                          <div
                            className={`rounded-2xl px-3 py-2 ${
                              isOwn
                                ? "bg-emerald-600 text-white rounded-br-md dark:bg-emerald-500"
                                : "bg-slate-100 text-slate-800 rounded-bl-md dark:bg-slate-800 dark:text-slate-100"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {tokens.map((token, i) =>
                                token.type === "task" ? (
                                  <Link
                                    key={i}
                                    href={`/plan/${planId}?mentee=${menteeId}&task=${token.taskId}`}
                                    title={token.taskTitle}
                                    className={`inline-block max-w-[180px] truncate align-middle rounded-md px-1.5 py-0.5 text-xs font-semibold transition-colors ${
                                      isOwn
                                        ? "bg-emerald-700 text-emerald-100 hover:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    @{token.taskTitle}
                                  </Link>
                                ) : (
                                  <span key={i}>{token.value}</span>
                                )
                              )}
                            </p>
                          </div>
                          <span
                            className={`mt-0.5 text-[10px] ${
                              isOwn ? "text-right text-slate-400 dark:text-slate-500" : "text-slate-400 ml-1 dark:text-slate-500"
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <MentionInput tasks={tasks} onSend={handleSend} />
    </div>
  );
}
