import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getMentorProfile,
  listPublicPlansByMentor,
} from "@/lib/queries/discovery";
import { PublicPlanCard } from "@/components/public-plan-card";

export const dynamic = "force-dynamic";

export default async function MentorProfilePage({
  params,
}: {
  params: Promise<{ mentorId: string }>;
}) {
  const { mentorId } = await params;
  const supabase = await createClient();
  const { mentor } = await getMentorProfile(supabase, mentorId);
  if (!mentor) notFound();

  const { plans } = await listPublicPlansByMentor(supabase, mentorId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to mentors
      </Link>

      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <Avatar name={mentor.name} src={mentor.avatar_url} large />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {mentor.name}
            </h1>
            {mentor.headline && (
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                {mentor.headline}
              </p>
            )}
            {mentor.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {mentor.skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  >
                    <Sparkles className="h-3 w-3" />
                    {s}
                  </span>
                ))}
              </div>
            )}
            {mentor.bio && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                {mentor.bio}
              </p>
            )}
          </div>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          Public plans
        </h2>
        {plans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No public plans yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {plans.map((p) => (
              <PublicPlanCard key={p.id} plan={p} showMentor={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Avatar({
  name,
  src,
  large,
}: {
  name: string;
  src: string | null;
  large?: boolean;
}) {
  const cls = large ? "h-16 w-16 text-lg" : "h-12 w-12 text-sm";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`${cls} shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700`}
      />
    );
  }
  return (
    <div
      className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/30`}
    >
      {initials || "?"}
    </div>
  );
}
