-- =====================================================================
-- 002_reset.sql — NUCLEAR RESET (destructive, manual-only)
-- =====================================================================
--
-- PURPOSE: Wipe every MentorSync table, function, trigger, and policy,
--          then let 001_initial_schema.sql rebuild from scratch.
--
-- ██████████████████████████████████████████████████████████████████
-- ██                        !! WARNING !!                          ██
-- ██                                                               ██
-- ██   THIS FILE DELETES ALL DATA — PLANS, TASKS, COMMENTS,       ██
-- ██   PHASES, PROFILES, MESSAGES. EVERYTHING. GONE FOREVER.      ██
-- ██                                                               ██
-- ██   NEVER run this on a database with data you want to keep.   ██
-- ██   NEVER wire this into a deploy pipeline or startup script.  ██
-- ██   ONLY run this manually, deliberately, from the Supabase     ██
-- ██   SQL Editor, when you intend a full schema reset.           ██
-- ██                                                               ██
-- ██   After running this file you MUST also run                  ██
-- ██   001_initial_schema.sql to recreate the schema.             ██
-- ██████████████████████████████████████████████████████████████████
--
-- HOW TO USE (intentional friction — read before you paste):
--
--   Step 1. Open Supabase Dashboard → SQL Editor.
--   Step 2. Paste and run THIS file first.
--   Step 3. Paste and run 001_initial_schema.sql second.
--
-- The DROP statements below are commented out as a second safety
-- gate. Uncomment them one-by-one only after you have confirmed
-- you are on the correct Supabase project and have no data to save.
-- =====================================================================


-- ── Uncomment below only when you are 100% sure ──────────────────

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- DROP TABLE IF EXISTS public.task_comment_reads CASCADE;
-- DROP TABLE IF EXISTS public.plan_chat_reads     CASCADE;
-- DROP TABLE IF EXISTS public.plan_messages       CASCADE;
-- DROP TABLE IF EXISTS public.comments            CASCADE;
-- DROP TABLE IF EXISTS public.tasks               CASCADE;
-- DROP TABLE IF EXISTS public.phases              CASCADE;
-- DROP TABLE IF EXISTS public.plan_assignments    CASCADE;
-- DROP TABLE IF EXISTS public.plans               CASCADE;
-- DROP TABLE IF EXISTS public.profiles            CASCADE;

-- DROP FUNCTION IF EXISTS public.get_plan_id_for_task(uuid)    CASCADE;
-- DROP FUNCTION IF EXISTS public.get_plan_id_for_phase(uuid)   CASCADE;
-- DROP FUNCTION IF EXISTS public.can_access_plan(uuid)         CASCADE;
-- DROP FUNCTION IF EXISTS public.is_plan_assigned_mentee(uuid) CASCADE;
-- DROP FUNCTION IF EXISTS public.is_plan_creator(uuid)         CASCADE;

-- ── End of drop block ─────────────────────────────────────────────
