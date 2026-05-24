"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { TaskRowEditor } from "@/components/task-row";
import type { TaskType } from "@/lib/types/database";

interface DraftTask {
  title: string;
  task_type: TaskType;
  week_number: number;
}

interface DraftPhase {
  title: string;
  tasks: DraftTask[];
  // ephemeral inputs for "add task" within this phase
  newTitle: string;
  newType: TaskType;
  newWeek: number;
  adding: boolean;
}

function emptyPhase(): DraftPhase {
  return {
    title: "",
    tasks: [],
    newTitle: "",
    newType: "weekday",
    newWeek: 1,
    adding: false,
  };
}

export default function CreatePlanPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalWeeks, setTotalWeeks] = useState(16);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [phases, setPhases] = useState<DraftPhase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  function updatePhase(index: number, patch: Partial<DraftPhase>) {
    setPhases((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p))
    );
  }

  function removePhase(index: number) {
    setPhases((prev) => prev.filter((_, i) => i !== index));
  }

  function addDraftTask(phaseIndex: number) {
    const p = phases[phaseIndex];
    if (!p.newTitle.trim()) return;
    updatePhase(phaseIndex, {
      tasks: [
        ...p.tasks,
        {
          title: p.newTitle.trim(),
          task_type: p.newType,
          week_number: p.newWeek,
        },
      ],
      newTitle: "",
      newWeek: 1,
      adding: false,
    });
  }

  function removeDraftTask(phaseIndex: number, taskIndex: number) {
    const p = phases[phaseIndex];
    updatePhase(phaseIndex, {
      tasks: p.tasks.filter((_, i) => i !== taskIndex),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { data: plan, error: insertError } = await supabase
      .from("plans")
      .insert({
        title,
        description: description || null,
        total_weeks: totalWeeks,
        start_date: startDate,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError || !plan) {
      setError(insertError?.message ?? "Failed to create plan");
      setLoading(false);
      return;
    }

    // Insert phases + tasks if any
    for (let i = 0; i < phases.length; i++) {
      const draft = phases[i];
      if (!draft.title.trim()) continue;
      const { data: phaseRow, error: phaseErr } = await supabase
        .from("phases")
        .insert({
          plan_id: plan.id,
          phase_number: i + 1,
          title: draft.title.trim(),
        })
        .select()
        .single();
      if (phaseErr || !phaseRow) continue;
      if (draft.tasks.length === 0) continue;
      const taskRows = draft.tasks.map((t, idx) => ({
        phase_id: phaseRow.id,
        title: t.title,
        task_type: t.task_type,
        week_number: t.week_number,
        sort_order: idx + 1,
      }));
      await supabase.from("tasks").insert(taskRows);
    }

    router.push(`/plan/${plan.id}/manage`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Create New Plan</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-slate-700"
          >
            Plan Title
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="e.g. Cloud Engineer 16-Week Transition"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-slate-700"
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="Brief description of the plan goals..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="weeks"
              className="block text-sm font-medium text-slate-700"
            >
              Total Weeks
            </label>
            <input
              id="weeks"
              type="number"
              min={1}
              max={52}
              required
              value={totalWeeks}
              onChange={(e) => setTotalWeeks(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-slate-700"
            >
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        {/* Phases & Tasks (optional) */}
        <div className="space-y-3 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Phases &amp; Tasks
              </h2>
              <p className="text-xs text-slate-500">
                Optional. You can also add these later on the manage page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPhases((prev) => [...prev, emptyPhase()])}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add phase
            </button>
          </div>

          {phases.map((phase, pi) => (
            <div
              key={pi}
              className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Phase {pi + 1}
                </span>
                <input
                  type="text"
                  value={phase.title}
                  onChange={(e) => updatePhase(pi, { title: e.target.value })}
                  placeholder="Phase title..."
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
                <button
                  type="button"
                  onClick={() => removePhase(pi)}
                  className="rounded p-1 text-slate-300 hover:text-red-500"
                  title="Remove phase"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {phase.tasks.length > 0 && (
                <div className="space-y-1">
                  {phase.tasks.map((t, ti) => (
                    <div
                      key={ti}
                      className="flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-sm"
                    >
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        W{t.week_number}
                      </span>
                      <span className="flex-1 truncate text-slate-700">
                        {t.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {t.task_type.replace("_", " ")}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDraftTask(pi, ti)}
                        className="rounded p-0.5 text-slate-300 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {phase.adding ? (
                <TaskRowEditor
                  title={phase.newTitle}
                  taskType={phase.newType}
                  weekNumber={phase.newWeek}
                  maxWeek={totalWeeks}
                  onTitleChange={(v) => updatePhase(pi, { newTitle: v })}
                  onTaskTypeChange={(v) => updatePhase(pi, { newType: v })}
                  onWeekNumberChange={(v) => updatePhase(pi, { newWeek: v })}
                  onSave={() => addDraftTask(pi)}
                  onCancel={() => updatePhase(pi, { adding: false })}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => updatePhase(pi, { adding: true })}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  <Plus className="h-3 w-3" />
                  Add task
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Plan"}
        </button>
      </form>
    </div>
  );
}
