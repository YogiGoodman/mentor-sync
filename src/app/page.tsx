import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-white text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
      <BackgroundLayer />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-neutral-50">
            Mentor<span className="text-emerald-600 dark:text-emerald-400">Sync</span>
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 pb-24 pt-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-hidden="true" />
          Mentor and mentee. In sync.
        </span>

        <h1 className="mt-8 text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl dark:text-neutral-50">
          Career plans
          <br />
          that don&apos;t stall.
        </h1>

        <p className="mt-6 max-w-xl text-balance text-base leading-relaxed text-slate-600 sm:text-lg dark:text-neutral-400">
          Break a transition into weekly phases. Your mentor sees your streak,
          comments on tasks, and nudges when you stall &mdash; in real time.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            Get started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="text-xs text-slate-500 dark:text-neutral-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-slate-700 underline-offset-4 hover:underline dark:text-neutral-300"
            >
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-16 w-full max-w-sm">
          <MoatGlyph />
        </div>
      </main>
    </div>
  );
}

function LogoMark() {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 dark:bg-emerald-500">
      <BookOpen className="h-4 w-4 text-white" aria-hidden="true" />
    </div>
  );
}

/**
 * Editorial, stroke-based glyph representing the moat:
 * two nodes (mentor + mentee) connected through a weekly heatmap row.
 * Single-color, scalable, quiet.
 */
function MoatGlyph() {
  // 14 cells representing two weeks of activity; varying fill weight.
  const cells = [0.15, 0.45, 0.85, 0.6, 0.3, 0.7, 1, 0.5, 0.25, 0.9, 0.6, 0.4, 0.75, 1];

  return (
    <svg
      viewBox="0 0 280 60"
      role="img"
      aria-hidden="true"
      className="mx-auto w-full text-emerald-600 dark:text-emerald-400"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Left node: mentee */}
      <circle cx="14" cy="30" r="8" />
      <circle cx="14" cy="30" r="2.2" fill="currentColor" stroke="none" />

      {/* Connector line into heatmap */}
      <line x1="24" y1="30" x2="48" y2="30" />

      {/* Heatmap row: 14 cells */}
      {cells.map((weight, i) => {
        const x = 50 + i * 14;
        return (
          <rect
            key={i}
            x={x}
            y={20}
            width={10}
            height={20}
            rx={1.5}
            fill="currentColor"
            fillOpacity={weight}
            stroke="none"
          />
        );
      })}

      {/* Connector line out of heatmap */}
      <line x1="232" y1="30" x2="256" y2="30" />

      {/* Right node: mentor */}
      <circle cx="266" cy="30" r="8" />
      <circle cx="266" cy="30" r="2.2" fill="currentColor" stroke="none" />

      {/* Subtle baseline ticks framing the row */}
      <line x1="50" y1="50" x2="230" y2="50" strokeOpacity={0.25} />
      <line x1="50" y1="48" x2="50" y2="52" strokeOpacity={0.4} />
      <line x1="140" y1="48" x2="140" y2="52" strokeOpacity={0.4} />
      <line x1="230" y1="48" x2="230" y2="52" strokeOpacity={0.4} />
    </svg>
  );
}

function BackgroundLayer() {
  return (
    <>
      <div
        aria-hidden="true"
        className="bg-grid-fade pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)] dark:opacity-30"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-100/40 to-transparent blur-3xl dark:from-emerald-500/10"
      />
    </>
  );
}
