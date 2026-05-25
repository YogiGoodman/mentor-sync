/**
 * Seed script for the sample 16-Week CCNP Cloud Engineer plan.
 *
 * Usage:
 *   npx tsx --env-file=.env src/seed/sample-plan.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY env vars.
 */

import { createClient } from "@supabase/supabase-js";
import { PLAN_TITLE, PLAN_DESCRIPTION, phases } from "./plan-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !secretKey) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function resolveMentor(): Promise<{ id: string } | null> {
  const mentorEmail = process.env.SEED_MENTOR_EMAIL;

  if (mentorEmail) {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authUser = authUsers?.users.find((u) => u.email === mentorEmail);
    if (authUser) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", authUser.id)
        .single();
      return data;
    }
    console.error(`No mentor profile found for email: ${mentorEmail}`);
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "mentor")
    .limit(1)
    .single();
  return data;
}

async function resolveMentee(): Promise<{ id: string } | null> {
  const menteeEmail = process.env.SEED_MENTEE_EMAIL;

  if (menteeEmail) {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authUser = authUsers?.users.find((u) => u.email === menteeEmail);
    if (authUser) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", authUser.id)
        .single();
      return data;
    }
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "mentee")
    .limit(1)
    .single();
  return data;
}

async function seed() {
  console.log("Seeding MentorSync database...\n");

  const mentor = await resolveMentor();
  if (!mentor) {
    console.error(
      "No mentor found. Sign up a mentor account first, or set SEED_MENTOR_EMAIL in .env"
    );
    process.exit(1);
  }
  console.log(`Using mentor: ${mentor.id}`);

  const mentee = await resolveMentee();

  const { data: existing } = await supabase
    .from("plans")
    .select("id")
    .eq("title", PLAN_TITLE)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("plans")
      .update({ created_by: mentor.id })
      .eq("id", existing.id);
    console.log(`Re-linked plan ownership to mentor ${mentor.id}`);

    if (mentee) {
      await supabase.from("plan_assignments").upsert(
        { plan_id: existing.id, mentee_id: mentee.id },
        { onConflict: "plan_id,mentee_id" }
      );
      console.log(`Re-linked plan assignment to mentee ${mentee.id}`);
    }

    console.log("Plan already exists. Ownership updated. Skipping insert.");
    return;
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({
      title: PLAN_TITLE,
      description: PLAN_DESCRIPTION,
      total_weeks: 16,
      created_by: mentor.id,
    })
    .select()
    .single();

  if (planError || !plan) {
    console.error("Failed to create plan:", planError);
    process.exit(1);
  }

  console.log(`Created plan: ${plan.title} (${plan.id})`);

  if (mentee) {
    await supabase.from("plan_assignments").insert({
      plan_id: plan.id,
      mentee_id: mentee.id,
    });
    console.log(`Assigned plan to mentee: ${mentee.id}`);
  } else {
    console.log("No mentee found — plan created but not assigned.");
  }

  for (const phaseData of phases) {
    const { data: phase, error: phaseError } = await supabase
      .from("phases")
      .insert({
        plan_id: plan.id,
        phase_number: phaseData.phase_number,
        title: phaseData.title,
        description: phaseData.description,
        strategic_focus: phaseData.strategic_focus,
      })
      .select()
      .single();

    if (phaseError || !phase) {
      console.error(`Failed to create phase ${phaseData.phase_number}:`, phaseError);
      continue;
    }

    console.log(`  Phase ${phase.phase_number}: ${phase.title}`);

    const { error: tasksError } = await supabase.from("tasks").insert(
      phaseData.tasks.map((t) => ({
        phase_id: phase.id,
        week_number: t.week_number,
        title: t.title,
        task_type: t.task_type,
        sort_order: t.sort_order,
      }))
    );

    if (tasksError) {
      console.error(`  Failed to insert tasks:`, tasksError);
    } else {
      console.log(`    Inserted ${phaseData.tasks.length} tasks`);
    }
  }

  console.log("\nSeed complete!");
}

seed().catch(console.error);
