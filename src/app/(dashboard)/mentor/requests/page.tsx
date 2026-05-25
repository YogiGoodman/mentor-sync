import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profile";
import { listPendingForMentor } from "@/lib/queries/access-requests";
import { RequestsList } from "@/components/requests-list";

export const dynamic = "force-dynamic";

export default async function MentorRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!profile) redirect("/login");
  if (profile.role !== "mentor") redirect("/dashboard");

  const { requests, error } = await listPendingForMentor(supabase);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Mentee requests
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Approve or reject mentees who want to join your plans.
          </p>
        </div>
        <Inbox className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
      </header>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}
      <RequestsList requests={requests} />
    </div>
  );
}
