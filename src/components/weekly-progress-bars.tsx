interface WeeklyProgressBarsProps {
  totalWeeks: number;
  /** completedAt ISO timestamps */
  completedAtDates: string[];
  startDate: string | null;
  height?: number;
}

/**
 * Lightweight inline SVG bar chart: tasks completed per week of plan duration.
 * Tracks theme via `currentColor` + Tailwind text-color utilities.
 */
export function WeeklyProgressBars({
  totalWeeks,
  completedAtDates,
  startDate,
  height = 60,
}: WeeklyProgressBarsProps) {
  const start = startDate ? new Date(startDate) : null;
  const weekCounts = new Array(totalWeeks).fill(0) as number[];

  if (start) {
    const startMs = start.getTime();
    for (const iso of completedAtDates) {
      const d = new Date(iso);
      const diff = d.getTime() - startMs;
      const w = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
      if (w >= 0 && w < totalWeeks) weekCounts[w] += 1;
    }
  } else {
    // No start: distribute counts into the last week as a fallback
    weekCounts[totalWeeks - 1] = completedAtDates.length;
  }

  const max = Math.max(1, ...weekCounts);
  const barWidth = 100 / totalWeeks;
  const gap = barWidth * 0.18;

  return (
    <div className="w-full text-emerald-500 dark:text-emerald-400">
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="h-14 w-full"
        role="img"
        aria-label="Weekly task completions"
      >
        {weekCounts.map((c, i) => {
          const h = (c / max) * (height - 4);
          const x = i * barWidth + gap / 2;
          const y = height - h;
          return (
            <g key={i}>
              <rect
                x={x}
                y={4}
                width={barWidth - gap}
                height={height - 4}
                className="fill-slate-100 dark:fill-slate-800"
                rx={1}
              />
              {c > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth - gap}
                  height={h}
                  fill="currentColor"
                  rx={1}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>W1</span>
        <span>W{totalWeeks}</span>
      </div>
    </div>
  );
}
