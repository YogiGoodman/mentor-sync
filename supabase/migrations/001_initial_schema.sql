-- MentorSync consolidated schema
-- Single canonical migration. Run on a fresh database.

-- =====================================================================
-- 1. Tables
-- =====================================================================

-- Profiles (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('mentor', 'mentee')) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Plans
CREATE TABLE plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  total_weeks INT NOT NULL DEFAULT 16,
  start_date DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Plan Assignments
CREATE TABLE plan_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE NOT NULL,
  mentee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(plan_id, mentee_id)
);

-- Phases
CREATE TABLE phases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE NOT NULL,
  phase_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  strategic_focus TEXT
);

-- Tasks
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID REFERENCES phases(id) ON DELETE CASCADE NOT NULL,
  week_number INT NOT NULL,
  title TEXT NOT NULL,
  task_type TEXT CHECK (task_type IN ('weekend', 'weekday', 'milestone', 'full_focus')) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE NOT NULL,
  is_blocked BOOLEAN DEFAULT FALSE NOT NULL,
  completed_at TIMESTAMPTZ,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Task-level comments
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Plan-level chat messages
CREATE TABLE plan_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mention_task_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Read cursors
CREATE TABLE plan_chat_reads (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plan_id)
);

CREATE TABLE task_comment_reads (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, task_id)
);

-- =====================================================================
-- 2. Indexes
-- =====================================================================

CREATE INDEX idx_phases_plan ON phases(plan_id);
CREATE INDEX idx_tasks_phase ON tasks(phase_id);
CREATE INDEX idx_tasks_week ON tasks(week_number);
CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_plan_assignments_mentee ON plan_assignments(mentee_id);
CREATE INDEX idx_plan_messages_plan_created ON plan_messages(plan_id, created_at);

-- =====================================================================
-- 3. Realtime publications
-- =====================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE plan_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE plan_chat_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comment_reads;

-- =====================================================================
-- 4. Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_plan_creator(p_plan_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM plans
    WHERE id = p_plan_id AND created_by = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_plan_assigned_mentee(p_plan_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM plan_assignments
    WHERE plan_id = p_plan_id AND mentee_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_plan(p_plan_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_plan_creator(p_plan_id)
      OR public.is_plan_assigned_mentee(p_plan_id);
$$;

CREATE OR REPLACE FUNCTION public.get_plan_id_for_phase(p_phase_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT plan_id FROM phases WHERE id = p_phase_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_plan_id_for_task(p_task_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT ph.plan_id
  FROM tasks t
  JOIN phases ph ON ph.id = t.phase_id
  WHERE t.id = p_task_id
  LIMIT 1;
$$;

-- =====================================================================
-- 5. Row Level Security
-- =====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_chat_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comment_reads ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Plans
CREATE POLICY "Mentors can create plans"
  ON plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'mentor')
  );

CREATE POLICY "Mentors can update own plans"
  ON plans FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Mentors can delete own plans"
  ON plans FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can view relevant plans"
  ON plans FOR SELECT
  TO authenticated
  USING (public.can_access_plan(id));

-- Plan Assignments
CREATE POLICY "Mentors can manage assignments"
  ON plan_assignments FOR ALL
  TO authenticated
  USING (public.is_plan_creator(plan_id))
  WITH CHECK (public.is_plan_creator(plan_id));

CREATE POLICY "Mentees can view own assignments"
  ON plan_assignments FOR SELECT
  TO authenticated
  USING (mentee_id = auth.uid());

-- Phases
CREATE POLICY "Phases viewable by plan participants"
  ON phases FOR SELECT
  TO authenticated
  USING (public.can_access_plan(plan_id));

CREATE POLICY "Mentors can manage phases"
  ON phases FOR ALL
  TO authenticated
  USING (public.is_plan_creator(plan_id))
  WITH CHECK (public.is_plan_creator(plan_id));

-- Tasks
CREATE POLICY "Tasks viewable by plan participants"
  ON tasks FOR SELECT
  TO authenticated
  USING (public.can_access_plan(public.get_plan_id_for_phase(phase_id)));

CREATE POLICY "Mentors can manage tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (public.is_plan_creator(public.get_plan_id_for_phase(phase_id)))
  WITH CHECK (public.is_plan_creator(public.get_plan_id_for_phase(phase_id)));

CREATE POLICY "Mentees can update task status"
  ON tasks FOR UPDATE
  TO authenticated
  USING (public.is_plan_assigned_mentee(public.get_plan_id_for_phase(phase_id)))
  WITH CHECK (public.is_plan_assigned_mentee(public.get_plan_id_for_phase(phase_id)));

-- Comments
CREATE POLICY "Comments viewable by plan participants"
  ON comments FOR SELECT
  TO authenticated
  USING (public.can_access_plan(public.get_plan_id_for_task(task_id)));

CREATE POLICY "Participants can add comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_plan(public.get_plan_id_for_task(task_id))
  );

-- Plan messages
CREATE POLICY "Plan participants can view messages"
  ON plan_messages FOR SELECT
  TO authenticated
  USING (public.can_access_plan(plan_id));

CREATE POLICY "Plan participants can send messages"
  ON plan_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_plan(plan_id)
  );

-- Plan chat reads
CREATE POLICY "Users can view own plan chat reads"
  ON plan_chat_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can upsert own plan chat reads"
  ON plan_chat_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own plan chat reads"
  ON plan_chat_reads FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Task comment reads
CREATE POLICY "Users can view own task comment reads"
  ON task_comment_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can upsert own task comment reads"
  ON task_comment_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own task comment reads"
  ON task_comment_reads FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- 6. Auto-create profile on signup
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'mentee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
