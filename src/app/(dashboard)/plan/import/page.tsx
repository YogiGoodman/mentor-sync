import { redirect } from "next/navigation";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profile";
import { PlanImportForm } from "@/components/plan-import-form";

export const dynamic = "force-dynamic";

export default async function ImportPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await ensureProfile(supabase, user);
  if (!profile) redirect("/login");
  if (profile.role !== "mentor") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Import a plan
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Upload a JSON or CSV that adheres to the plan schema. Validate, preview, then commit.
          </p>
        </div>
        <Upload className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
      </header>

      <PlanImportForm />

      <section className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
        <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">
          Schema reference
        </p>
        <p className="mb-1">
          <strong>JSON</strong>: <code>{`{ title, description, total_weeks, start_date?, phases: [ { phase_number, title, description, strategic_focus, tasks: [ { week_number, title, task_type, sort_order } ] } ] }`}</code>
        </p>
        <p>
          <strong>CSV columns</strong>: phase_number, phase_title, phase_description, phase_strategic_focus, week_number, task_title, task_type, sort_order. Plan-level metadata (title, total_weeks, description, start_date) goes in the form above.
        </p>
        <p className="mt-1">
          <strong>task_type</strong> must be one of <code>weekend | weekday | milestone | full_focus</code>.
        </p>
      </section>
    </div>
  );
}
