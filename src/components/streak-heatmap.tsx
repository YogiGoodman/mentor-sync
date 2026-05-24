"use client";

import { useMemo } from "react";
import type { TaskWithCommentCount } from "@/lib/types/database";
import {
  buildHeatmapData,
  getIntensityColor,
  HEATMAP_COLORS,
  computeCurrentStreak,
} from "@/lib/heatmap";
import { Flame } from "lucide-react";

interface StreakHeatmapProps {
  tasks: TaskWithCommentCount[];
  startDate: string | null;
  totalWeeks: number;
  compact?: boolean;
  showLegend?: boolean;
}

const DOW_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];
const DOW_LABELS_SHORT = ["M", "", "W", "", "F", "", ""];

export function StreakHeatmap({
  tasks,
  startDate,
  totalWeeks,
  compact = false,
  showLegend = true,
}: StreakHeatmapProps) {
  const { days, months, weeks } = useMemo(
    () => buildHeatmapData(tasks, startDate, totalWeeks),
    [tasks, startDate, totalWeeks]
  );

  const streak = useMemo(() => computeCurrentStreak(tasks), [tasks]);

  const cellSize = compact ? 10 : 13;
  const gap = compact ? 2 : 3;
  const labelWidth = compact ? 0 : 28;
  const labels = compact ? DOW_LABELS_SHORT : DOW_LABELS;

  return (
    <div className="inline-flex flex-col gap-1.5">
      {/* Current streak badge */}
      {!compact && streak > 0 && (
        <div className="mb-1 flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold text-slate-800">
            {streak} day streak
          </span>
        </div>
      )}

      {/* Month headers - using CSS grid with proper column spans */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${labelWidth}px repeat(${weeks}, ${cellSize}px)`,
          gap: `0 ${gap}px`,
          marginBottom: 2,
        }}
      >
        <div />
        {months.map((m, i) => (
          <div
            key={i}
            className="text-[11px] font-medium text-slate-500 truncate"
            style={{
              gridColumn: `${m.colStart + 2} / span ${m.colSpan}`,
            }}
          >
            {m.colSpan >= 2 ? m.label : ""}
          </div>
        ))}
      </div>

      {/* Grid with day labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${labelWidth}px repeat(${weeks}, ${cellSize}px)`,
          gridTemplateRows: `repeat(7, ${cellSize}px)`,
          gap,
        }}
      >
        {Array.from({ length: 7 }).map((_, dayIdx) => (
          <div
            key={`label-${dayIdx}`}
            className="flex items-center text-slate-400"
            style={{
              gridColumn: 1,
              gridRow: dayIdx + 1,
              fontSize: compact ? 9 : 11,
              lineHeight: `${cellSize}px`,
            }}
          >
            {!compact && labels[dayIdx]}
          </div>
        ))}

        {Array.from({ length: weeks }).map((_, weekIdx) =>
          Array.from({ length: 7 }).map((_, dayIdx) => {
            const idx = weekIdx * 7 + dayIdx;
            const day = days[idx];

            if (!day) {
              return (
                <div
                  key={`empty-${weekIdx}-${dayIdx}`}
                  style={{
                    gridColumn: weekIdx + 2,
                    gridRow: dayIdx + 1,
                    width: cellSize,
                    height: cellSize,
                  }}
                />
              );
            }

            const bg = day.isFuture
              ? HEATMAP_COLORS.future
              : getIntensityColor(day.count);

            return (
              <div
                key={day.dateKey}
                className="rounded-sm transition-colors"
                style={{
                  gridColumn: weekIdx + 2,
                  gridRow: dayIdx + 1,
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: bg,
                  border: day.isFuture
                    ? `1px solid ${HEATMAP_COLORS.futureBorder}`
                    : undefined,
                  outline: day.isToday
                    ? `2px solid ${HEATMAP_COLORS.todayRing}`
                    : undefined,
                  outlineOffset: day.isToday ? 1 : undefined,
                }}
                title={`${day.dateKey}: ${day.count} task${day.count !== 1 ? "s" : ""} completed`}
              />
            );
          })
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Less</span>
            {[
              HEATMAP_COLORS.empty,
              HEATMAP_COLORS.level1,
              HEATMAP_COLORS.level2,
              HEATMAP_COLORS.level3,
              HEATMAP_COLORS.level4,
            ].map((color) => (
              <div
                key={color}
                className="rounded-sm"
                style={{
                  width: compact ? 10 : 12,
                  height: compact ? 10 : 12,
                  backgroundColor: color,
                }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  );
}
