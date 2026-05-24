"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { Plan, Phase, TaskWithCommentCount, Role } from "@/lib/types/database";
import { useRealtimeTasks, getTasksByPhaseAndWeek } from "@/lib/hooks/use-realtime-tasks";
import { PhaseSection } from "@/components/phase-section";
import { CommentPanel } from "@/components/comment-panel";
import { PlanChatPanel } from "@/components/plan-chat-panel";
import { StreakHeatmap } from "@/components/streak-heatmap";
import { ProgressGauge } from "@/components/progress-gauge";
import { countActiveDays } from "@/lib/heatmap";
import { ArrowLeft, Settings, Flame, MessageSquare, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useNotifications } from "@/lib/hooks/notifications-context";

interface PlanViewProps {
  plan: Plan;
  phases: Phase[];
  userId: string;
  role: Role;
}

export function PlanView({ plan, phases, userId, role }: PlanViewProps) {
  const searchParams = useSearchParams();
  const phaseIds = useMemo(() => phases.map((p) => p.id), [phases]);
  const { tasks, loading, toggleComplete, toggleBlocked } =
    useRealtimeTasks(phaseIds);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const notif = useNotifications();
  const chatUnread = notif?.counts.byPlan[plan.id]?.messages ?? 0;

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const grouped = useMemo(
    () => getTasksByPhaseAndWeek(tasks, phases),
    [tasks, phases]
  );

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.is_completed).length;
  const overallProgress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const activeDays = useMemo(() => countActiveDays(tasks), [tasks]);

  // Handle ?chat=1 deep link
  useEffect(() => {
    if (searchParams.get("chat") === "1") {
      setChatOpen(true);
      setChatMinimized(false);
    }
  }, [searchParams]);

  // Handle ?task=<id> deep link. Only fires once per unique searchParams +
  // task-id combination so that ambient `tasks` updates (e.g. toggling
  // completion) don't re-open the comment dialog.
  const handledTaskParamRef = useRef<string | null>(null);
  useEffect(() => {
    const taskParam = searchParams.get("task");
    if (!taskParam || tasks.length === 0) return;

    const sig = `${searchParams.toString()}::${taskParam}`;
    if (handledTaskParamRef.current === sig) return;

    const exists = tasks.some((t) => t.id === taskParam);
    if (!exists) return;

    handledTaskParamRef.current = sig;
    setHighlightedTaskId(taskParam);

    if (searchParams.get("comments") === "1") {
      setSelectedTaskId(taskParam);
    }

    setTimeout(() => {
      document
        .getElementById(`task-${taskParam}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    const timer = setTimeout(() => setHighlightedTaskId(null), 3000);
    return () => clearTimeout(timer);
  }, [searchParams, tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600 dark:border-slate-700 dark:border-t-emerald-400" />
      </div>
    );
  }

  return (
    <>
      <div className="relative mx-auto max-w-4xl space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard"
            className="mt-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 truncate dark:text-white">
              {plan.title}
            </h1>
            {plan.description && (
              <p className="mt-1 text-slate-600 text-sm dark:text-slate-400">{plan.description}</p>
            )}
          </div>
          {role === "mentor" && (
            <Link
              href={`/plan/${plan.id}/manage`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shrink-0 transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Manage</span>
            </Link>
          )}
        </div>

        {/* Progress Section */}
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Activity
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Tasks completed per day
                </p>
              </div>
              {activeDays > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Flame className="h-3.5 w-3.5" />
                  {activeDays} active {activeDays === 1 ? "day" : "days"}
                </span>
              )}
            </div>
            <div className="overflow-x-auto pb-1">
              <StreakHeatmap
                tasks={tasks}
                startDate={plan.start_date}
                totalWeeks={plan.total_weeks}
              />
            </div>
          </div>
          <div className="flex items-center rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <ProgressGauge
              percentage={overallProgress}
              completed={completedTasks}
              total={totalTasks}
            />
          </div>
        </div>

        {/* Phases */}
        <div className="space-y-4">
          {phases.map((phase) => (
            <PhaseSection
              key={phase.id}
              phase={phase}
              tasks={grouped[phase.id] ?? {}}
              onToggleComplete={toggleComplete}
              onToggleBlocked={toggleBlocked}
              onOpenComments={setSelectedTaskId}
              highlightedTaskId={highlightedTaskId}
            />
          ))}
        </div>
      </div>

      {/* Floating chat FAB */}
      {!chatOpen && (
        <button
          onClick={() => {
            setChatOpen(true);
            setChatMinimized(false);
          }}
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95"
          title="Open plan chat"
        >
          <MessageSquare className="h-5 w-5" />
          {chatUnread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {chatUnread > 9 ? "9+" : chatUnread}
            </span>
          )}
        </button>
      )}

      {/* Minimized chat bar */}
      {chatOpen && chatMinimized && (
        <button
          onClick={() => setChatMinimized(false)}
          className="fixed bottom-0 right-6 z-40 flex h-12 w-72 items-center gap-2 rounded-t-lg bg-slate-900 px-4 text-white shadow-lg hover:bg-slate-800 transition-colors dark:bg-slate-800 dark:hover:bg-slate-700"
          title="Restore plan chat"
        >
          <MessageSquare className="h-4 w-4 text-emerald-400" />
          <span className="flex-1 text-left text-sm font-semibold">Plan Chat</span>
          {chatUnread > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {chatUnread > 9 ? "9+" : chatUnread}
            </span>
          )}
          <ChevronUp className="h-4 w-4 text-slate-300" />
        </button>
      )}

      {/* Comment Panel */}
      <CommentPanel
        task={selectedTask}
        userId={userId}
        open={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
      />

      {/* Plan Chat Panel */}
      <PlanChatPanel
        planId={plan.id}
        userId={userId}
        tasks={tasks}
        open={chatOpen && !chatMinimized}
        onClose={() => {
          setChatOpen(false);
          setChatMinimized(false);
        }}
        onMinimize={() => setChatMinimized(true)}
      />
    </>
  );
}
