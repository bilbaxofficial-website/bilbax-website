import { createClient } from "../../../lib/supabase-server";
import { NextResponse } from "next/server";

const VALID_PLANS = new Set(["free", "starter", "growth", "pro"]);

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedPlan = (searchParams.get("plan") || "").toLowerCase();

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const createdAt = new Date(user.created_at).getTime();
  const now = Date.now();
  const isBrandNewUser = now - createdAt < 5 * 60 * 1000;

  if (isBrandNewUser && VALID_PLANS.has(requestedPlan)) {
    return NextResponse.redirect(
      `${origin}/onboarding/instagram?plan=${encodeURIComponent(requestedPlan)}`
    );
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
