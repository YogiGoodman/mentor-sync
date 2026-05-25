import { PlanTreeSchema } from "./plan-schema";
import type { PlanTree } from "@/lib/types/database";

export interface ImportError {
  path: string;
  message: string;
}

export interface ImportResult {
  tree: PlanTree | null;
  errors: ImportError[];
}

export function jsonToPlan(input: unknown): ImportResult {
  const parsed = PlanTreeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      tree: null,
      errors: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    };
  }
  return { tree: parsed.data as PlanTree, errors: [] };
}
