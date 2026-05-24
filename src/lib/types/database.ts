export type Role = "mentor" | "mentee";
export type TaskType = "weekend" | "weekday" | "milestone" | "full_focus";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
}

export interface Plan {
  id: string;
  title: string;
  description: string | null;
  total_weeks: number;
  start_date: string | null;
  created_by: string;
  created_at: string;
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

export interface Task {
  id: string;
  phase_id: string;
  week_number: number;
  title: string;
  task_type: TaskType;
  is_completed: boolean;
  is_blocked: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface CommentAuthor {
  name: string;
  role: Role;
}

export interface Comment {
  id: string;
  task_id: string;
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

export interface TaskWithCommentCount extends Task {
  comment_count: number;
}

export interface PlanMessage {
  id: string;
  plan_id: string;
  user_id: string;
  content: string;
  mention_task_ids: string[];
  created_at: string;
  profiles?: CommentAuthor;
}

export interface PlanChatRead {
  user_id: string;
  plan_id: string;
  last_read_at: string;
}

export interface TaskCommentRead {
  user_id: string;
  task_id: string;
  last_read_at: string;
}
