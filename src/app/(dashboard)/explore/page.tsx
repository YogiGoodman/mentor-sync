import Link from "next/link";
import { Compass } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listMentors } from "@/lib/queries/discovery";
import { MentorCard } from "@/components/mentor-card";

export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  const { skill } = await searchParams;
  const supabase = await createClient();
  const { mentors, error } = await listMentors(supabase, { skill });

  const allSkills = Array.from(
    new Set(mentors.flatMap((m) => m.skills))
  ).slice(0, 20);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Explore mentors
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Browse mentors and their published plans. Request access to join.
          </p>
        </div>
        <Compass className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
      </header>

      {allSkills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Filter:
          </span>
          <SkillChip label="All" href="/explore" active={!skill} />
          {allSkills.map((s) => (
            <SkillChip
              key={s}
              label={s}
              href={`/explore?skill=${encodeURIComponent(s)}`}
              active={skill === s}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          Could not load mentors: {error}
        </div>
      )}

      {mentors.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {skill
              ? `No mentors with skill "${skill}" yet.`
              : "No mentors available yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mentors.map((m) => (
            <MentorCard key={m.id} mentor={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function SkillChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
        active
          ? "bg-slate-900 text-white dark:bg-emerald-600"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </Link>
  );
}
