import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types/database";

/**
 * Ensures a profile row exists for the authenticated user.
 * The handle_new_user() trigger should create it on signup; this is the
 * idempotent fallback for users who signed up before the trigger existed,
 * or whose insert lost a race with the first authed request.
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
): Promise<Profile | null> {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    if (selectError.message?.includes("schema cache")) {
      console.error(
        "[ensureProfile] 'profiles' table missing — apply " +
          "supabase/migrations/001_initial_schema.sql to the Supabase project."
      );
    } else {
      console.error("[ensureProfile] Select failed:", selectError.message);
    }
    return null;
  }

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
    console.error("[ensureProfile] Insert failed:", error.message);
    return null;
  }

  return created as Profile;
}
