import { CsvRowSchema, CsvImportMetaSchema } from "./plan-schema";
import type {
  PlanTree,
  PlanTreePhase,
  PlanTreeTask,
} from "@/lib/types/database";
import type { ImportError, ImportResult } from "./json-to-plan";

export interface CsvImportInput {
  meta: unknown; // { title, description, total_weeks, start_date? }
  rows: unknown[];
}

/**
 * Pure: take flat CSV rows + plan-level meta → nested PlanTree.
 * Rows are grouped by phase_number; phase title/description/strategic_focus
 * are taken from the first row of each phase group.
 */
export function csvToPlan(input: CsvImportInput): ImportResult {
  const errors: ImportError[] = [];

  const metaParsed = CsvImportMetaSchema.safeParse(input.meta);
  if (!metaParsed.success) {
    for (const issue of metaParsed.error.issues) {
      errors.push({
        path: `meta.${issue.path.join(".")}`,
        message: issue.message,
      });
    }
  }

  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    errors.push({ path: "rows", message: "CSV has no data rows" });
    return { tree: null, errors };
  }

  const phaseMap = new Map<
    number,
    {
      phase_number: number;
      title: string;
      description: string | null;
      strategic_focus: string | null;
      tasks: PlanTreeTask[];
    }
  >();

  input.rows.forEach((raw, idx) => {
    const rowParsed = CsvRowSchema.safeParse(raw);
    if (!rowParsed.success) {
      for (const issue of rowParsed.error.issues) {
        errors.push({
          path: `rows[${idx}].${issue.path.join(".")}`,
          message: issue.message,
        });
      }
      return;
    }
    const row = rowParsed.data;
    let phase = phaseMap.get(row.phase_number);
    if (!phase) {
      phase = {
        phase_number: row.phase_number,
        title: row.phase_title,
        description: row.phase_description || null,
        strategic_focus: row.phase_strategic_focus || null,
        tasks: [],
      };
      phaseMap.set(row.phase_number, phase);
    }
    phase.tasks.push({
      week_number: row.week_number,
      title: row.task_title,
      task_type: row.task_type,
      sort_order: row.sort_order,
    });
  });

  if (errors.length > 0) {
    return { tree: null, errors };
  }

  const phases: PlanTreePhase[] = Array.from(phaseMap.values())
    .sort((a, b) => a.phase_number - b.phase_number)
    .map((p) => ({
      ...p,
      tasks: p.tasks.sort(
        (a, b) =>
          a.week_number - b.week_number || a.sort_order - b.sort_order
      ),
    }));

  const meta = metaParsed.data!;
  const tree: PlanTree = {
    title: meta.title,
    description: meta.description || null,
    total_weeks: meta.total_weeks,
    start_date: meta.start_date ?? null,
    phases,
  };

  return { tree, errors: [] };
}
