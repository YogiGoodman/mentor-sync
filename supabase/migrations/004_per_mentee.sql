-- 004_per_mentee.sql — make plan progress and conversations per-mentee.
--
-- Before this migration, completion/blocked state lived on the shared `tasks`
-- row, and chat/comments scoped only by plan/task. That meant every mentee in a
-- plan saw identical progress and a single shared chat. This migration treats
-- plans/phases/tasks as a shared *curriculum template* and adds a per-mentee
-- overlay (`task_progress`) plus a per-mentee conversation thread
-- (`mentee_id` on plan_messages / comments).
--
-- A reset of existing progress + conversation data was chosen (pre-launch), so
-- read-cursor tables are recreated and message/comment rows are truncated.
-- Apply after 001_initial_schema.sql and 003_discovery.sql.

-- =====================================================================
-- 1. Per-mentee task progress overlay
-- =====================================================================

CREATE TABLE IF NOT EXISTS task_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, mentee_id)
);

CREATE INDEX IF NOT EXISTS idx_task_progress_mentee ON task_progress(mentee_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_task ON task_progress(task_id);

-- Tasks are now a pure template — drop the shared per-mentee state columns.
ALTER TABLE tasks
  DROP COLUMN IF EXISTS is_completed,
  DROP COLUMN IF EXISTS is_blocked,
  DROP COLUMN IF EXISTS completed_at;

-- The old per-mentee UPDATE policy on tasks no longer applies (tasks are
-- mentor-managed template rows; mentees write task_progress instead).
DROP POLICY IF EXISTS "Mentees can update task status" ON tasks;

-- =====================================================================
-- 2. Per-mentee conversation threads
-- =====================================================================

-- A thread is (plan_id, mentee_id) for chat and (task_id, mentee_id) for
-- comments. Reset chosen: clear existing rows that have no thread owner.
TRUNCATE plan_messages;
TRUNCATE comments;

ALTER TABLE plan_messages
  ADD COLUMN IF NOT EXISTS mentee_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS mentee_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE plan_messages ALTER COLUMN mentee_id SET NOT NULL;
ALTER TABLE comments ALTER COLUMN mentee_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plan_messages_thread
  ON plan_messages(plan_id, mentee_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_thread
  ON comments(task_id, mentee_id, created_at);

-- =====================================================================
-- 3. Read cursors gain the mentee dimension (recreate — reset chosen)
-- =====================================================================

DROP TABLE IF EXISTS plan_chat_reads CASCADE;
DROP TABLE IF EXISTS task_comment_reads CASCADE;

CREATE TABLE plan_chat_reads (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plan_id, mentee_id)
);

CREATE TABLE task_comment_reads (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, task_id, mentee_id)
);

-- =====================================================================
-- 4. Performance: index missing FK used by mentor aggregates
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_plan_assignments_plan ON plan_assignments(plan_id);

-- =====================================================================
-- 5. Realtime publications
-- =====================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE task_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE plan_chat_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comment_reads;

-- =====================================================================
-- 6. Helper: does auth.uid() participate in a (plan, mentee) thread?
--    True for the thread's mentee or the plan's creator (mentor).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.can_access_thread(p_plan_id uuid, p_mentee_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() = p_mentee_id OR public.is_plan_creator(p_plan_id);
$$;

-- =====================================================================
-- 7. Row Level Security
-- =====================================================================

ALTER TABLE task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_chat_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comment_reads ENABLE ROW LEVEL SECURITY;

-- task_progress: mentee owns own rows; plan creator can read all of their plan's.
CREATE POLICY "task_progress_select"
  ON task_progress FOR SELECT
  TO authenticated
  USING (
    mentee_id = auth.uid()
    OR public.is_plan_creator(public.get_plan_id_for_task(task_id))
  );

CREATE POLICY "task_progress_insert"
  ON task_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    mentee_id = auth.uid()
    AND public.is_plan_assigned_mentee(public.get_plan_id_for_task(task_id))
  );

CREATE POLICY "task_progress_update"
  ON task_progress FOR UPDATE
  TO authenticated
  USING (mentee_id = auth.uid())
  WITH CHECK (mentee_id = auth.uid());

-- plan_messages: rebuild policies to be thread-scoped.
DROP POLICY IF EXISTS "Plan participants can view messages" ON plan_messages;
DROP POLICY IF EXISTS "Plan participants can send messages" ON plan_messages;

CREATE POLICY "plan_messages_select_thread"
  ON plan_messages FOR SELECT
  TO authenticated
  USING (public.can_access_thread(plan_id, mentee_id));

CREATE POLICY "plan_messages_insert_thread"
  ON plan_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_thread(plan_id, mentee_id)
  );

-- comments: rebuild policies to be thread-scoped (plan derived from task).
DROP POLICY IF EXISTS "Comments viewable by plan participants" ON comments;
DROP POLICY IF EXISTS "Participants can add comments" ON comments;

CREATE POLICY "comments_select_thread"
  ON comments FOR SELECT
  TO authenticated
  USING (public.can_access_thread(public.get_plan_id_for_task(task_id), mentee_id));

CREATE POLICY "comments_insert_thread"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_thread(public.get_plan_id_for_task(task_id), mentee_id)
  );

-- Read cursors: a user manages only their own cursors.
CREATE POLICY "plan_chat_reads_select"
  ON plan_chat_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "plan_chat_reads_insert"
  ON plan_chat_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "plan_chat_reads_update"
  ON plan_chat_reads FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_comment_reads_select"
  ON task_comment_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "task_comment_reads_insert"
  ON task_comment_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "task_comment_reads_update"
  ON task_comment_reads FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
