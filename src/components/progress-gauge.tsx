"use client";

interface ProgressGaugeProps {
  percentage: number;
  completed: number;
  total: number;
}

export function ProgressGauge({
  percentage,
  completed,
  total,
}: ProgressGaugeProps) {
  const radius = 56;
  const strokeWidth = 10;
  const circumference = Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={radius * 2 + strokeWidth}
        height={radius + strokeWidth + 12}
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius + strokeWidth / 2} A ${radius} ${radius} 0 0 1 ${radius * 2 + strokeWidth / 2} ${radius + strokeWidth / 2}`}
          fill="none"
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius + strokeWidth / 2} A ${radius} ${radius} 0 0 1 ${radius * 2 + strokeWidth / 2} ${radius + strokeWidth / 2}`}
          fill="none"
          stroke={percentage >= 100 ? "#10b981" : percentage >= 50 ? "#34d399" : "#6ee7b7"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        <text
          x={radius + strokeWidth / 2}
          y={radius - 6}
          textAnchor="middle"
          className="fill-slate-900 dark:fill-white"
          fontSize="26"
          fontWeight="800"
        >
          {percentage}%
        </text>
        <text
          x={radius + strokeWidth / 2}
          y={radius + 14}
          textAnchor="middle"
          className="fill-slate-400 dark:fill-slate-500"
          fontSize="11"
          fontWeight="500"
        >
          {completed}/{total} tasks
        </text>
      </svg>
    </div>
  );
}
