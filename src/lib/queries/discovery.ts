import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, Profile } from "@/lib/types/database";

export interface MentorSummary {
  id: string;
  name: string;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  public_plan_count: number;
}

export interface PublicPlanSummary {
  id: string;
  title: string;
  description: string | null;
  total_weeks: number;
  created_at: string;
  created_by: string;
  mentor: { id: string; name: string; avatar_url: string | null } | null;
  phase_count: number;
}

/**
 * List mentors who have at least one public plan (or any mentor if includeEmpty).
 * Optional skill filter (case-insensitive substring on skills[] entries).
 */
export async function listMentors(
  supabase: SupabaseClient,
  opts: { skill?: string; limit?: number } = {}
): Promise<{ mentors: MentorSummary[]; error: string | null }> {
  const limit = opts.limit ?? 100;
  let q = supabase
    .from("profiles")
    .select("id, name, avatar_url, headline, bio, skills")
    .eq("role", "mentor")
    .limit(limit);

  if (opts.skill && opts.skill.trim()) {
    q = q.contains("skills", [opts.skill.trim()]);
  }

  const { data: mentors, error } = await q;
  if (error) return { mentors: [], error: error.message };

  const ids = (mentors ?? []).map((m) => m.id);
  if (ids.length === 0) return { mentors: [], error: null };

  const { data: planCounts } = await supabase
    .from("plans")
    .select("created_by, id")
    .in("created_by", ids)
    .eq("is_public", true);

  const countMap = new Map<string, number>();
  for (const row of planCounts ?? []) {
    countMap.set(row.created_by, (countMap.get(row.created_by) ?? 0) + 1);
  }

  return {
    mentors: (mentors as Profile[]).map((m) => ({
      id: m.id,
      name: m.name,
      avatar_url: m.avatar_url,
      headline: m.headline ?? null,
      bio: m.bio ?? null,
      skills: m.skills ?? [],
      public_plan_count: countMap.get(m.id) ?? 0,
    })),
    error: null,
  };
}

export async function getMentorProfile(
  supabase: SupabaseClient,
  mentorId: string
): Promise<{ mentor: MentorSummary | null; error: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, headline, bio, skills, role")
    .eq("id", mentorId)
    .eq("role", "mentor")
    .maybeSingle();

  if (error) return { mentor: null, error: error.message };
  if (!data) return { mentor: null, error: null };

  const { count } = await supabase
    .from("plans")
    .select("id", { count: "exact", head: true })
    .eq("created_by", mentorId)
    .eq("is_public", true);

  return {
    mentor: {
      id: data.id,
      name: data.name,
      avatar_url: data.avatar_url,
      headline: data.headline ?? null,
      bio: data.bio ?? null,
      skills: data.skills ?? [],
      public_plan_count: count ?? 0,
    },
    error: null,
  };
}

export async function listPublicPlansByMentor(
  supabase: SupabaseClient,
  mentorId: string
): Promise<{ plans: PublicPlanSummary[]; error: string | null }> {
  const { data, error } = await supabase
    .from("plans")
    .select(
      "id, title, description, total_weeks, created_at, created_by, mentor:profiles!plans_created_by_fkey(id, name, avatar_url)"
    )
    .eq("created_by", mentorId)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) return { plans: [], error: error.message };

  const ids = (data ?? []).map((p) => p.id);
  const phaseCounts = await fetchPhaseCounts(supabase, ids);

  return {
    plans: (data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      total_weeks: p.total_weeks,
      created_at: p.created_at,
      created_by: p.created_by,
      mentor: Array.isArray(p.mentor) ? p.mentor[0] ?? null : p.mentor ?? null,
      phase_count: phaseCounts.get(p.id) ?? 0,
    })),
    error: null,
  };
}

export async function getPublicPlanSummary(
  supabase: SupabaseClient,
  planId: string
): Promise<{ plan: PublicPlanSummary | null; error: string | null }> {
  const { data, error } = await supabase
    .from("plans")
    .select(
      "id, title, description, total_weeks, created_at, created_by, is_public, mentor:profiles!plans_created_by_fkey(id, name, avatar_url)"
    )
    .eq("id", planId)
    .maybeSingle();

  if (error) return { plan: null, error: error.message };
  if (!data || !data.is_public) return { plan: null, error: null };

  const phaseCounts = await fetchPhaseCounts(supabase, [data.id]);

  return {
    plan: {
      id: data.id,
      title: data.title,
      description: data.description,
      total_weeks: data.total_weeks,
      created_at: data.created_at,
      created_by: data.created_by,
      mentor: Array.isArray(data.mentor)
        ? data.mentor[0] ?? null
        : data.mentor ?? null,
      phase_count: phaseCounts.get(data.id) ?? 0,
    },
    error: null,
  };
}

export async function listAllPublicPlans(
  supabase: SupabaseClient,
  limit = 100
): Promise<{ plans: PublicPlanSummary[]; error: string | null }> {
  const { data, error } = await supabase
    .from("plans")
    .select(
      "id, title, description, total_weeks, created_at, created_by, mentor:profiles!plans_created_by_fkey(id, name, avatar_url)"
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { plans: [], error: error.message };

  const ids = (data ?? []).map((p) => p.id);
  const phaseCounts = await fetchPhaseCounts(supabase, ids);

  return {
    plans: (data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      total_weeks: p.total_weeks,
      created_at: p.created_at,
      created_by: p.created_by,
      mentor: Array.isArray(p.mentor) ? p.mentor[0] ?? null : p.mentor ?? null,
      phase_count: phaseCounts.get(p.id) ?? 0,
    })),
    error: null,
  };
}

async function fetchPhaseCounts(
  supabase: SupabaseClient,
  planIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (planIds.length === 0) return map;
  const { data } = await supabase
    .from("phases")
    .select("plan_id")
    .in("plan_id", planIds);
  for (const r of data ?? []) {
    map.set(r.plan_id, (map.get(r.plan_id) ?? 0) + 1);
  }
  return map;
}

// Re-export Plan for callers
export type { Plan };
