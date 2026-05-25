import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profile";
import { ProfileEditForm } from "./profile-edit-form";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!profile) redirect("/login");

  // refetch with new fields
  const { data } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, role, bio, headline, skills")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Your profile
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {profile.role === "mentor"
            ? "What mentees see when they discover you in /explore."
            : "How mentors see you in their roster."}
        </p>
      </header>
      <ProfileEditForm
        initial={{
          name: data?.name ?? profile.name,
          avatar_url: data?.avatar_url ?? null,
          bio: data?.bio ?? "",
          headline: data?.headline ?? "",
          skills: data?.skills ?? [],
        }}
        role={profile.role}
      />
    </div>
  );
}
