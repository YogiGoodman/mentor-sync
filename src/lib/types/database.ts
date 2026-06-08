export type Role = "mentor" | "mentee";
export type TaskType = "weekend" | "weekday" | "milestone" | "full_focus";
export type AccessRequestStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
  bio?: string | null;
  headline?: string | null;
  skills?: string[];
}

export interface Plan {
  id: string;
  title: string;
  description: string | null;
  total_weeks: number;
  start_date: string | null;
  created_by: string;
  created_at: string;
  is_public?: boolean;
}

export interface PlanAccessRequest {
  id: string;
  plan_id: string;
  mentee_id: string;
  status: AccessRequestStatus;
  message: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

// Shape used by import + seed pipelines (mirrors src/seed/plan-data.ts)
export interface PlanTreeTask {
  week_number: number;
  title: string;
  task_type: TaskType;
  sort_order: number;
}

export interface PlanTreePhase {
  phase_number: number;
  title: string;
  description: string | null;
  strategic_focus: string | null;
  tasks: PlanTreeTask[];
}

export interface PlanTree {
  title: string;
  description: string | null;
  total_weeks: number;
  start_date?: string | null;
  phases: PlanTreePhase[];
}

export interface PlanAssignment {
  id: string;
  plan_id: string;
  mentee_id: string;
  assigned_at: string;
}

export interface Phase {
  id: string;
  plan_id: string;
  phase_number: number;
  title: string;
  description: string | null;
  strategic_focus: string | null;
}

// `tasks` is a shared curriculum template — it carries no per-mentee state.
export interface Task {
  id: string;
  phase_id: string;
  week_number: number;
  title: string;
  task_type: TaskType;
  sort_order: number;
  created_at: string;
}

// Per-mentee overlay: completion / blocked state for one mentee on one task.
export interface TaskProgress {
  id: string;
  task_id: string;
  mentee_id: string;
  is_completed: boolean;
  is_blocked: boolean;
  completed_at: string | null;
  updated_at: string;
}

export interface CommentAuthor {
  name: string;
  role: Role;
}

export interface Comment {
  id: string;
  task_id: string;
  mentee_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: CommentAuthor;
}

export interface PlanWithPhases extends Plan {
  phases: PhaseWithTasks[];
}

export interface PhaseWithTasks extends Phase {
  tasks: TaskWithCommentCount[];
}

// Client-side merged shape: template task + the active mentee's progress
// overlay + comment count. `is_completed` / `is_blocked` / `completed_at`
// reflect the mentee currently in context (default false / null when no
// task_progress row exists yet).
export interface TaskWithCommentCount extends Task {
  is_completed: boolean;
  is_blocked: boolean;
  completed_at: string | null;
  comment_count: number;
}

export interface PlanMessage {
  id: string;
  plan_id: string;
  mentee_id: string;
  user_id: string;
  content: string;
  mention_task_ids: string[];
  created_at: string;
  profiles?: CommentAuthor;
}

export interface PlanChatRead {
  user_id: string;
  plan_id: string;
  mentee_id: string;
  last_read_at: string;
}

export interface TaskCommentRead {
  user_id: string;
  task_id: string;
  mentee_id: string;
  last_read_at: string;
}
