-- 003_discovery.sql — mentor discovery, plan publishing, access requests, mentor profile.
-- Apply after 001_initial_schema.sql. Idempotent guards used where possible.

-- =====================================================================
-- 1. Profile extensions: bio / headline / skills
-- =====================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_profiles_skills_gin ON profiles USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =====================================================================
-- 2. Plan publish flag
-- =====================================================================

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_plans_public ON plans(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_plans_created_by ON plans(created_by);

-- =====================================================================
-- 3. Access requests
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE access_request_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS plan_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status access_request_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES profiles(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_request
  ON plan_access_requests(plan_id, mentee_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_par_plan   ON plan_access_requests(plan_id);
CREATE INDEX IF NOT EXISTS idx_par_mentee ON plan_access_requests(mentee_id);
CREATE INDEX IF NOT EXISTS idx_par_status ON plan_access_requests(status);

ALTER TABLE plan_access_requests ENABLE ROW LEVEL SECURITY;

-- mentee inserts own request
DROP POLICY IF EXISTS "mentee_insert_own_request" ON plan_access_requests;
CREATE POLICY "mentee_insert_own_request" ON plan_access_requests
  FOR INSERT TO authenticated
  WITH CHECK (mentee_id = auth.uid());

-- mentee selects own requests (any status)
DROP POLICY IF EXISTS "mentee_select_own" ON plan_access_requests;
CREATE POLICY "mentee_select_own" ON plan_access_requests
  FOR SELECT TO authenticated
  USING (mentee_id = auth.uid());

-- mentor selects requests on plans they own
DROP POLICY IF EXISTS "mentor_select_for_owned_plans" ON plan_access_requests;
CREATE POLICY "mentor_select_for_owned_plans" ON plan_access_requests
  FOR SELECT TO authenticated
  USING (public.is_plan_creator(plan_id));

-- mentor approves / rejects (status update) on plans they own
DROP POLICY IF EXISTS "mentor_update_for_owned_plans" ON plan_access_requests;
CREATE POLICY "mentor_update_for_owned_plans" ON plan_access_requests
  FOR UPDATE TO authenticated
  USING (public.is_plan_creator(plan_id))
  WITH CHECK (public.is_plan_creator(plan_id));

-- =====================================================================
-- 4. Broaden plans SELECT — public-summary access.
--    Phases / tasks / messages / assignments stay gated by their own
--    can_access_plan policies, so no detail leakage.
-- =====================================================================

DROP POLICY IF EXISTS "Users can view relevant plans" ON plans;
CREATE POLICY "plans_select_participants_or_public" ON plans
  FOR SELECT TO authenticated
  USING (public.can_access_plan(id) OR is_public = TRUE);

-- =====================================================================
-- 5. Atomic approve RPC: flips request + inserts assignment in one tx.
--    SECURITY DEFINER so insert into plan_assignments doesn't trip the
--    mentor's policy from a function context. Manual ownership check.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.approve_access_request(p_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r plan_access_requests%ROWTYPE;
BEGIN
  SELECT * INTO r FROM plan_access_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF NOT public.is_plan_creator(r.plan_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE plan_access_requests
     SET status = 'approved',
         decided_at = now(),
         decided_by = auth.uid()
   WHERE id = p_request_id;

  INSERT INTO plan_assignments(plan_id, mentee_id)
    VALUES (r.plan_id, r.mentee_id)
    ON CONFLICT (plan_id, mentee_id) DO NOTHING;
END
$$;

REVOKE ALL ON FUNCTION public.approve_access_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_access_request(UUID) TO authenticated;

-- =====================================================================
-- 6. Reject helper (kept simple — direct UPDATE under RLS would also work,
--    but RPC gives a uniform server-side surface).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.reject_access_request(p_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r plan_access_requests%ROWTYPE;
BEGIN
  SELECT * INTO r FROM plan_access_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF NOT public.is_plan_creator(r.plan_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE plan_access_requests
     SET status = 'rejected',
         decided_at = now(),
         decided_by = auth.uid()
   WHERE id = p_request_id;
END
$$;

REVOKE ALL ON FUNCTION public.reject_access_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_access_request(UUID) TO authenticated;
