import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        weekend:
          "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
        weekday:
          "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
        milestone:
          "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        full_focus:
          "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
        default:
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
