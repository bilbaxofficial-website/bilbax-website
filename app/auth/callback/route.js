import { createClient } from "../../../lib/supabase-server";
import { NextResponse } from "next/server";

const VALID_PLANS = new Set(["free", "starter", "growth", "pro"]);

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedPlan = (searchParams.get("plan") || "").toLowerCase();

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Google auth callback failed:", error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Trust a plan from the URL only when it matches the server-set
  // onboarding cookie. This prevents arbitrary plan activation.
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").filter(Boolean).map((part) => {
      const index = part.indexOf("=");
      return [
        part.slice(0, index).trim(),
        decodeURIComponent(part.slice(index + 1).trim()),
      ];
    })
  );

  const pendingPlan =
    cookies.bilbax_pending_plan || cookies.bilbax_onboarding_plan || "";

  if (
    VALID_PLANS.has(requestedPlan) &&
    VALID_PLANS.has(pendingPlan) &&
    requestedPlan === pendingPlan
  ) {
    return NextResponse.redirect(
      `${origin}/onboarding/instagram?plan=${encodeURIComponent(requestedPlan)}`
    );
  }

  const { data: subscription, error } = await supabase
    .from("user_subscriptions")
    .select("plan, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Subscription lookup failed:", error);
    return NextResponse.redirect(`${origin}/#pricing`);
  }

  if (subscription?.onboarding_completed) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  if (subscription?.plan && VALID_PLANS.has(subscription.plan)) {
    return NextResponse.redirect(
      `${origin}/onboarding/instagram?plan=${encodeURIComponent(subscription.plan)}`
    );
  }

  return NextResponse.redirect(`${origin}/#pricing`);
}
