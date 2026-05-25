import { z } from "zod";

export const TaskTypeSchema = z.enum([
  "weekend",
  "weekday",
  "milestone",
  "full_focus",
]);

export const PlanTreeTaskSchema = z.object({
  week_number: z.coerce.number().int().min(1),
  title: z.string().min(1).max(500),
  task_type: TaskTypeSchema,
  sort_order: z.coerce.number().int().min(0).default(0),
});

export const PlanTreePhaseSchema = z.object({
  phase_number: z.coerce.number().int().min(1),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional().transform((v) => v ?? null),
  strategic_focus: z.string().nullable().optional().transform((v) => v ?? null),
  tasks: z.array(PlanTreeTaskSchema).min(0),
});

export const PlanTreeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional().transform((v) => v ?? null),
  total_weeks: z.coerce.number().int().min(1).max(104).default(16),
  start_date: z
    .string()
    .nullable()
    .optional()
    .refine(
      (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "start_date must be YYYY-MM-DD"
    )
    .transform((v) => v ?? null),
  phases: z.array(PlanTreePhaseSchema).min(1, "At least one phase required"),
});

export const CsvRowSchema = z.object({
  phase_number: z.coerce.number().int().min(1),
  phase_title: z.string().min(1),
  phase_description: z.string().optional().default(""),
  phase_strategic_focus: z.string().optional().default(""),
  week_number: z.coerce.number().int().min(1),
  task_title: z.string().min(1),
  task_type: TaskTypeSchema,
  sort_order: z.coerce.number().int().min(0).optional().default(0),
});

export type CsvRow = z.infer<typeof CsvRowSchema>;

export const CsvImportMetaSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  total_weeks: z.coerce.number().int().min(1).max(104).default(16),
  start_date: z.string().optional().nullable(),
});

export type CsvImportMeta = z.infer<typeof CsvImportMetaSchema>;
