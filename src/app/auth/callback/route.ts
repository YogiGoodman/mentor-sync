import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the email-confirmation / OAuth redirect from Supabase Auth.
 * Supabase appends ?code=... to the URL we configure as the redirect target.
 * We exchange that code for a session cookie, then bounce to ?next= (or /dashboard).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Fall through: send user to login with an error flag
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Could not verify email link")}`
  );
}
