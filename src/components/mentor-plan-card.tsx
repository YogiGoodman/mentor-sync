"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Inbox,
  Settings,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { WeeklyProgressBars } from "@/components/weekly-progress-bars";
import type { Plan } from "@/lib/types/database";

interface MentorPlanCardProps {
  plan: Plan;
  menteeCount: number;
  pendingRequestCount: number;
  completedAtDates: string[];
}

export function MentorPlanCard({
  plan,
  menteeCount,
  pendingRequestCount,
  completedAtDates,
}: MentorPlanCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [isPublic, setIsPublic] = useState(!!plan.is_public);

  async function togglePublish() {
    setBusy(true);
    try {
      const res = await fetch(`/api/plans/${plan.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !isPublic }),
      });
      if (res.ok) {
        setIsPublic(!isPublic);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/plan/${plan.id}`}
            className="text-base font-semibold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-400"
          >
            {plan.title}
          </Link>
          {plan.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
              {plan.description}
            </p>
          )}
        </div>
        <button
          onClick={togglePublish}
          disabled={busy}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${
            isPublic
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
          title={isPublic ? "Click to unpublish" : "Click to publish"}
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isPublic ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
          {isPublic ? "Public" : "Draft"}
        </button>
      </div>

      <div className="mt-4">
        <WeeklyProgressBars
          totalWeeks={plan.total_weeks}
          completedAtDates={completedAtDates}
          startDate={plan.start_date}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {menteeCount} {menteeCount === 1 ? "mentee" : "mentees"}
        </span>
        {pendingRequestCount > 0 && (
          <Link
            href="/mentor/requests"
            className="inline-flex items-center gap-1 text-amber-600 hover:underline dark:text-amber-400"
          >
            <Inbox className="h-3.5 w-3.5" />
            {pendingRequestCount} pending
          </Link>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Link
          href={`/mentor/plans/${plan.id}/mentees`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Users className="h-3.5 w-3.5" />
          Roster
        </Link>
        <Link
          href={`/plan/${plan.id}/manage`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Settings className="h-3.5 w-3.5" />
          Manage
        </Link>
      </div>
    </div>
  );
}
