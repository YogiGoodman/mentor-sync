"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import type { Role } from "@/lib/types/database";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("mentee");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleResend() {
    setResendStatus(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard`,
      },
    });
    setResendStatus(error ? error.message : "Confirmation email re-sent. Check your inbox.");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { name, role },
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Supabase returns a user with identities: [] when the email is already
    // registered AND email confirmation is enabled. Detect that explicitly so
    // we don't silently fall through.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setDuplicate(true);
      setError(
        "An account with this email already exists. Sign in below, or " +
          "resend the confirmation link if you never verified it."
      );
      setLoading(false);
      return;
    }

    // No session means email confirmation is required.
    if (!data.session) {
      setConfirmSent(true);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (confirmSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg text-center dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Check your email
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We sent a confirmation link to{" "}
            <span className="font-medium text-slate-900 dark:text-white">{email}</span>. Click the
            link to finish creating your account.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5">
            <BookOpen className="h-7 w-7 shrink-0 text-emerald-500" />
            <h1 className="text-2xl font-bold leading-none tracking-tight text-slate-900 dark:text-white">
              MentorSync
            </h1>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Create your account</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 space-y-2 dark:bg-red-500/10 dark:text-red-300">
              <p>{error}</p>
              {duplicate && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResend}
                    className="rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/20"
                  >
                    Resend confirmation
                  </button>
                  <Link
                    href="/login"
                    className="rounded-md bg-red-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500"
                  >
                    Go to sign in
                  </Link>
                </div>
              )}
              {resendStatus && (
                <p className="text-xs text-red-800 dark:text-red-300">{resendStatus}</p>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Role
            </label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("mentee")}
                className={`rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                  role === "mentee"
                    ? "border-slate-900 bg-slate-900 text-white dark:border-emerald-500 dark:bg-emerald-600"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Mentee
              </button>
              <button
                type="button"
                onClick={() => setRole("mentor")}
                className={`rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                  role === "mentor"
                    ? "border-slate-900 bg-slate-900 text-white dark:border-emerald-500 dark:bg-emerald-600"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Mentor
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:focus:ring-emerald-500 dark:focus:ring-offset-slate-900"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-slate-900 hover:underline dark:text-emerald-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
