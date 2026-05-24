import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types/database";

/**
 * Ensures a profile row exists for the authenticated user.
 * The DB trigger should create this on signup, but it may fail if
 * migration 001 wasn't applied before the first signup.
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
): Promise<Profile | null> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return existing as Profile;

  const name =
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "User";
  const role =
    (user.user_metadata?.role as string | undefined) === "mentor"
      ? "mentor"
      : "mentee";

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, name, role })
    .select("*")
    .single();

  if (error) {
    console.error("[ensureProfile] Failed to create profile:", error.message);
    return null;
  }

  return created as Profile;
}
