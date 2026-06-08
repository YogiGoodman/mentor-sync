# Database schema & migrations

Apply in order against a clean database via the Supabase SQL Editor:

1. `001_initial_schema.sql` — core tables, RLS, helpers, signup trigger.
2. `003_discovery.sql` — mentor discovery, plan publishing, access requests.
3. `004_per_mentee.sql` — per-mentee progress + per-mentee conversation threads.

`002_reset.sql` drops everything; run it first only when intentionally
resetting, then re-run 001 → 003 → 004.

## Data model (after 004)

The model separates a **shared template** from **per-mentee state**.

| Concern | Table | Scope |
|---|---|---|
| Curriculum (mentor-authored) | `plans` → `phases` → `tasks` | shared template; one row per plan |
| Enrollment | `plan_assignments` | one row per (plan, mentee) |
| Progress | `task_progress` | one row per (task, mentee) — completion / blocked |
| Plan chat | `plan_messages` (`plan_id`, `mentee_id`) | thread = (plan, mentee) |
| Task discussion | `comments` (`task_id`, `mentee_id`) | thread = (task, mentee) |
| Unread cursors | `plan_chat_reads`, `task_comment_reads` | per (user, …, mentee) |

Key consequences:

- **`tasks` carries no completion state.** Completion / blocked / `completed_at`
  live in `task_progress`, keyed by `(task_id, mentee_id)`. Each mentee has an
  independent overlay; the mentor reads every mentee's.
- **A conversation belongs to one (plan, mentee) pair.** The plan's creator
  (mentor) participates in every mentee thread; a mentee sees only their own.
  Enforced by the `can_access_thread(plan_id, mentee_id)` SECURITY DEFINER
  helper used in `plan_messages` / `comments` RLS.

## RLS

All policies route through `SECURITY DEFINER STABLE` helpers
(`is_plan_creator`, `is_plan_assigned_mentee`, `can_access_plan`,
`can_access_thread`, `get_plan_id_for_task`) to avoid policy recursion and keep
the predicate cost low.

## Hot-path indexes

- `task_progress(mentee_id)`, `task_progress(task_id)` — overlay merge + roster aggregate.
- `plan_messages(plan_id, mentee_id, created_at)`, `comments(task_id, mentee_id, created_at)` — thread fetch/pagination.
- `plan_assignments(plan_id)` and `plan_assignments(mentee_id)` — roster + mentee plan lists.

## Query conventions

- Read progress with a single overlay query scoped by mentee, then merge onto
  the template tasks client-side (see `use-realtime-tasks.ts`). Do **not** fetch
  per-task counts in a loop.
- Realtime: subscribe with `filter: mentee_id=eq.<menteeId>` (and verify the
  plan/task in the callback) so a client only receives its own thread's events.
