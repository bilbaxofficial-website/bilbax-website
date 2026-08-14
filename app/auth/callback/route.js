// This runs automatically right after Google sends the user back to our site.
// It exchanges the temporary code for a real login session, then sends
// the user to their dashboard.
import { createClient } from "../../../lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
