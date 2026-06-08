"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  UserPlus,
  Save,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import type { Plan, Phase, Task, TaskType, Profile } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { TaskRowEditor } from "@/components/task-row";

export default function ManagePlanPage() {
  const params = useParams<{ planId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mentees, setMentees] = useState<Profile[]>([]);
  const [assignedMentees, setAssignedMentees] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // New phase form
  const [newPhaseTitle, setNewPhaseTitle] = useState("");

  // New task form
  const [addingTaskPhaseId, setAddingTaskPhaseId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<TaskType>("weekday");
  const [newTaskWeek, setNewTaskWeek] = useState(1);

  // Edit existing task
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<TaskType>("weekday");
  const [editWeek, setEditWeek] = useState(1);

  // Plan rename / delete
  const [editingMeta, setEditingMeta] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: planData } = await supabase
      .from("plans")
      .select("*")
      .eq("id", params.planId)
      .single();

    if (!planData) {
      router.push("/dashboard");
      return;
    }

    setPlan(planData);
    setTitleDraft(planData.title);
    setDescDraft(planData.description ?? "");

    const { data: phasesData } = await supabase
      .from("phases")
      .select("*")
      .eq("plan_id", params.planId)
      .order("phase_number");

    setPhases(phasesData ?? []);

    if (phasesData && phasesData.length > 0) {
      const phaseIds = phasesData.map((p) => p.id);
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .in("phase_id", phaseIds)
        .order("week_number")
        .order("sort_order");
      setTasks(tasksData ?? []);
    }

    const { data: allMentees } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "mentee");

    setMentees(allMentees ?? []);

    const { data: assignments } = await supabase
      .from("plan_assignments")
      .select("mentee_id")
      .eq("plan_id", params.planId);

    setAssignedMentees(assignments?.map((a) => a.mentee_id) ?? []);
    setLoading(false);
  }, [params.planId, supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function addPhase() {
    if (!newPhaseTitle.trim()) return;

    const nextNumber = phases.length + 1;
    const { error } = await supabase.from("phases").insert({
      plan_id: params.planId,
      phase_number: nextNumber,
      title: newPhaseTitle.trim(),
    });

    if (!error) {
      setNewPhaseTitle("");
      fetchData();
    }
  }

  async function deletePhase(phaseId: string) {
    await supabase.from("phases").delete().eq("id", phaseId);
    fetchData();
  }

  async function addTask() {
    if (!addingTaskPhaseId || !newTaskTitle.trim()) return;

    const phaseTasks = tasks.filter((t) => t.phase_id === addingTaskPhaseId);
    const maxSort = phaseTasks.length > 0
      ? Math.max(...phaseTasks.map((t) => t.sort_order))
      : 0;

    const { error } = await supabase.from("tasks").insert({
      phase_id: addingTaskPhaseId,
      week_number: newTaskWeek,
      title: newTaskTitle.trim(),
      task_type: newTaskType,
      sort_order: maxSort + 1,
    });

    if (!error) {
      setNewTaskTitle("");
      setAddingTaskPhaseId(null);
      fetchData();
    }
  }

  async function deleteTask(taskId: string) {
    await supabase.from("tasks").delete().eq("id", taskId);
    fetchData();
  }

  function startEditTask(task: Task) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditType(task.task_type);
    setEditWeek(task.week_number);
    setAddingTaskPhaseId(null);
  }

  async function saveEditTask() {
    if (!editingTaskId || !editTitle.trim()) return;
    const { error } = await supabase
      .from("tasks")
      .update({
        title: editTitle.trim(),
        task_type: editType,
        week_number: editWeek,
      })
      .eq("id", editingTaskId);
    if (!error) {
      setEditingTaskId(null);
      fetchData();
    }
  }

  async function savePlanMeta() {
    if (!titleDraft.trim()) return;
    setSavingMeta(true);
    const { error } = await supabase
      .from("plans")
      .update({
        title: titleDraft.trim(),
        description: descDraft.trim() || null,
      })
      .eq("id", params.planId);
    setSavingMeta(false);
    if (!error) {
      setEditingMeta(false);
      fetchData();
    }
  }

  async function deletePlan() {
    setDeleting(true);
    const { error } = await supabase
      .from("plans")
      .delete()
      .eq("id", params.planId);
    if (error) {
      setDeleting(false);
      return;
    }
    // phases, tasks, assignments and progress cascade-delete with the plan.
    router.push("/dashboard");
  }

  async function toggleMenteeAssignment(menteeId: string) {
    if (assignedMentees.includes(menteeId)) {
      await supabase
        .from("plan_assignments")
        .delete()
        .eq("plan_id", params.planId)
        .eq("mentee_id", menteeId);
    } else {
      await supabase.from("plan_assignments").insert({
        plan_id: params.planId,
        mentee_id: menteeId,
      });
    }
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-700 dark:border-t-emerald-400" />
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/plan/${plan.id}`}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Manage: {plan.title}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {plan.total_weeks} weeks &middot; {tasks.length} tasks &middot;{" "}
            {assignedMentees.length} mentee(s)
          </p>
        </div>
        {!editingMeta && (
          <button
            onClick={() => setEditingMeta(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Pencil className="h-3.5 w-3.5" />
            Rename
          </button>
        )}
      </div>

      {/* Plan details (rename) */}
      {editingMeta && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Plan details
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Title
              </label>
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                maxLength={200}
                placeholder="Plan title..."
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
                onKeyDown={(e) => e.key === "Enter" && savePlanMeta()}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Description
              </label>
              <textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                rows={2}
                placeholder="Optional description..."
                className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={savePlanMeta}
                disabled={!titleDraft.trim() || savingMeta}
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                {savingMeta ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </button>
              <button
                onClick={() => {
                  setEditingMeta(false);
                  setTitleDraft(plan.title);
                  setDescDraft(plan.description ?? "");
                }}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Mentees */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Assigned Mentees
          </h2>
        </div>
        {mentees.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No mentee accounts exist yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mentees.map((mentee) => {
              const isAssigned = assignedMentees.includes(mentee.id);
              return (
                <button
                  key={mentee.id}
                  onClick={() => toggleMenteeAssignment(mentee.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    isAssigned
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                      : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
                  }`}
                >
                  {mentee.name}
                  {isAssigned && " ✓"}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Phases & Tasks */}
      <div className="space-y-4">
        {phases.map((phase) => {
          const phaseTasks = tasks
            .filter((t) => t.phase_id === phase.id)
            .sort((a, b) => a.week_number - b.week_number || a.sort_order - b.sort_order);

          return (
            <div
              key={phase.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Phase {phase.phase_number}: {phase.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {phaseTasks.length} tasks
                  </p>
                </div>
                <button
                  onClick={() => deletePhase(phase.id)}
                  className="rounded-md p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  title="Delete phase"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="divide-y divide-slate-50 px-5 dark:divide-slate-800/60">
                {phaseTasks.map((task) =>
                  editingTaskId === task.id ? (
                    <div key={task.id} className="py-2.5">
                      <TaskRowEditor
                        title={editTitle}
                        taskType={editType}
                        weekNumber={editWeek}
                        maxWeek={plan.total_weeks}
                        onTitleChange={setEditTitle}
                        onTaskTypeChange={setEditType}
                        onWeekNumberChange={setEditWeek}
                        onSave={saveEditTask}
                        onCancel={() => setEditingTaskId(null)}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <Badge variant={task.task_type} className="shrink-0">
                        W{task.week_number}
                      </Badge>
                      <span className="flex-1 text-sm text-slate-700 truncate dark:text-slate-200">
                        {task.title}
                      </span>
                      <Badge variant={task.task_type}>
                        {task.task_type.replace("_", " ")}
                      </Badge>
                      <button
                        onClick={() => startEditTask(task)}
                        className="rounded p-1 text-slate-300 hover:text-slate-700 dark:text-slate-600 dark:hover:text-slate-200"
                        title="Edit task"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="rounded p-1 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400"
                        title="Delete task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* Add task inline */}
              {addingTaskPhaseId === phase.id ? (
                <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                  <TaskRowEditor
                    title={newTaskTitle}
                    taskType={newTaskType}
                    weekNumber={newTaskWeek}
                    maxWeek={plan.total_weeks}
                    onTitleChange={setNewTaskTitle}
                    onTaskTypeChange={setNewTaskType}
                    onWeekNumberChange={setNewTaskWeek}
                    onSave={addTask}
                    onCancel={() => setAddingTaskPhaseId(null)}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setAddingTaskPhaseId(phase.id);
                      setNewTaskTitle("");
                      setNewTaskWeek(1);
                      setEditingTaskId(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add task
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Phase */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">
              Add New Phase
            </label>
            <input
              type="text"
              value={newPhaseTitle}
              onChange={(e) => setNewPhaseTitle(e.target.value)}
              placeholder="Phase title..."
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
              onKeyDown={(e) => e.key === "Enter" && addPhase()}
            />
          </div>
          <button
            onClick={addPhase}
            disabled={!newPhaseTitle.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Add Phase
          </button>
        </div>
      </div>

      {/* Danger zone — delete plan */}
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-500/30 dark:bg-red-500/5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">
            Danger zone
          </h2>
        </div>
        <p className="mt-1 text-sm text-red-600/80 dark:text-red-300/70">
          Deleting this plan permanently removes its phases, tasks, mentee
          assignments and all progress. This cannot be undone.
        </p>
        {confirmDelete ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              Delete &ldquo;{plan.title}&rdquo;?
            </span>
            <button
              onClick={deletePlan}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete plan
          </button>
        )}
      </div>
    </div>
  );
}
