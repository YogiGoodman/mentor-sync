import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanAccessRequest } from "@/lib/types/database";

export interface AccessRequestWithMentee extends PlanAccessRequest {
  mentee: { id: string; name: string; avatar_url: string | null };
  plan: { id: string; title: string };
}

export interface AccessRequestWithPlan extends PlanAccessRequest {
  plan: { id: string; title: string; created_by: string };
}

export async function listPendingForMentor(
  supabase: SupabaseClient
): Promise<{ requests: AccessRequestWithMentee[]; error: string | null }> {
  const { data, error } = await supabase
    .from("plan_access_requests")
    .select(
      "id, plan_id, mentee_id, status, message, created_at, decided_at, decided_by, mentee:profiles!plan_access_requests_mentee_id_fkey(id, name, avatar_url), plan:plans(id, title)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return { requests: [], error: error.message };
  return {
    requests: (data ?? []) as unknown as AccessRequestWithMentee[],
    error: null,
  };
}

export async function listForMentee(
  supabase: SupabaseClient,
  menteeId: string
): Promise<{ requests: AccessRequestWithPlan[]; error: string | null }> {
  const { data, error } = await supabase
    .from("plan_access_requests")
    .select(
      "id, plan_id, mentee_id, status, message, created_at, decided_at, decided_by, plan:plans(id, title, created_by)"
    )
    .eq("mentee_id", menteeId)
    .order("created_at", { ascending: false });

  if (error) return { requests: [], error: error.message };
  return {
    requests: (data ?? []) as unknown as AccessRequestWithPlan[],
    error: null,
  };
}

export async function createRequest(
  supabase: SupabaseClient,
  planId: string,
  menteeId: string,
  message: string | null
) {
  return supabase
    .from("plan_access_requests")
    .insert({ plan_id: planId, mentee_id: menteeId, message })
    .select()
    .single();
}

export async function approveRequest(
  supabase: SupabaseClient,
  requestId: string
) {
  return supabase.rpc("approve_access_request", { p_request_id: requestId });
}

export async function rejectRequest(
  supabase: SupabaseClient,
  requestId: string
) {
  return supabase.rpc("reject_access_request", { p_request_id: requestId });
}
