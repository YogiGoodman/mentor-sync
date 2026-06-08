-- 005_proof.sql — public, verifiable proof-of-progress summary.
--
-- The accountability graph's shareable artifact: an aggregate of a mentee's
-- real, timestamped task_progress history. Exposed via a SECURITY DEFINER RPC
-- so a /p/<menteeId> page can render it without a session (RLS would otherwise
-- hide another user's progress). Returns only aggregates + public profile
-- fields (name, headline, avatar) — no private content.
-- Apply after 004_per_mentee.sql.

CREATE OR REPLACE FUNCTION public.get_proof_summary(p_mentee_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT json_build_object(
    'mentee', (
      SELECT json_build_object(
        'name', name,
        'headline', headline,
        'avatar_url', avatar_url
      )
      FROM profiles WHERE id = p_mentee_id AND role = 'mentee'
    ),
    'total_completed', (
      SELECT count(*) FROM task_progress
      WHERE mentee_id = p_mentee_id AND is_completed
    ),
    'active_days', (
      SELECT count(DISTINCT (completed_at AT TIME ZONE 'UTC')::date)
      FROM task_progress
      WHERE mentee_id = p_mentee_id AND completed_at IS NOT NULL
    ),
    'first_activity', (
      SELECT min(completed_at) FROM task_progress
      WHERE mentee_id = p_mentee_id AND completed_at IS NOT NULL
    ),
    'last_activity', (
      SELECT max(completed_at) FROM task_progress
      WHERE mentee_id = p_mentee_id AND completed_at IS NOT NULL
    ),
    'plans', (
      SELECT coalesce(json_agg(row_to_json(p)), '[]'::json) FROM (
        SELECT pl.title,
               count(t.id) AS total,
               count(*) FILTER (WHERE tp.is_completed) AS completed
        FROM plan_assignments pa
        JOIN plans pl ON pl.id = pa.plan_id
        JOIN phases ph ON ph.plan_id = pl.id
        JOIN tasks t ON t.phase_id = ph.id
        LEFT JOIN task_progress tp
          ON tp.task_id = t.id AND tp.mentee_id = p_mentee_id
        WHERE pa.mentee_id = p_mentee_id
        GROUP BY pl.id, pl.title
        ORDER BY pl.title
      ) p
    ),
    'completions', (
      SELECT coalesce(json_agg(row_to_json(c)), '[]'::json) FROM (
        SELECT t.title AS task_title,
               tp.completed_at,
               pl.title AS plan_title
        FROM task_progress tp
        JOIN tasks t ON t.id = tp.task_id
        JOIN phases ph ON ph.id = t.phase_id
        JOIN plans pl ON pl.id = ph.plan_id
        WHERE tp.mentee_id = p_mentee_id AND tp.completed_at IS NOT NULL
        ORDER BY tp.completed_at DESC
        LIMIT 100
      ) c
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_proof_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_proof_summary(uuid) TO anon, authenticated;
