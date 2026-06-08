import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import type { MentorSummary } from "@/lib/queries/discovery";

interface MentorCardProps {
  mentor: MentorSummary;
}

export function MentorCard({ mentor }: MentorCardProps) {
  return (
    <Link
      href={`/explore/mentors/${mentor.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:shadow-emerald-500/5"
    >
      <div className="flex items-start gap-3">
        <Avatar name={mentor.name} src={mentor.avatar_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors dark:text-white dark:group-hover:text-emerald-400">
              {mentor.name}
            </h3>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-emerald-500 dark:text-slate-600 dark:group-hover:text-emerald-400" />
          </div>
          {mentor.headline && (
            <p className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-300">
              {mentor.headline}
            </p>
          )}
        </div>
      </div>

      {mentor.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {mentor.skills.slice(0, 5).map((s) => (
            <span
              key={s}
              className="rounded-md border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              {s}
            </span>
          ))}
          {mentor.skills.length > 5 && (
            <span className="px-1 py-0.5 text-xs text-slate-400 dark:text-slate-500">
              +{mentor.skills.length - 5} more
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <BookOpen className="h-3.5 w-3.5" />
        {mentor.public_plan_count} public {mentor.public_plan_count === 1 ? "plan" : "plans"}
      </div>
    </Link>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
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
        className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/30">
      {initials || "?"}
    </div>
  );
}
