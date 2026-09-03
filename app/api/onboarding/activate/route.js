import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";
import { cookies } from "next/headers";

const VALID_PLANS = new Set(["free", "starter", "growth", "pro"]);

export async function GET(request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const cookieStore = await cookies();
  const pendingPlan = (cookieStore.get("bilbax_pending_plan")?.value || "").toLowerCase();

  if (!VALID_PLANS.has(pendingPlan)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const { data: existing, error: lookupError } = await supabase
    .from("user_subscriptions")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    console.error("Subscription lookup failed:", lookupError);
  }

  if (!existing?.onboarding_completed) {
    const { error: upsertError } = await supabase
      .from("user_subscriptions")
      .upsert(
        {
          user_id: user.id,
          plan: pendingPlan,
          status: "active",
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Plan activation failed:", upsertError);
      return NextResponse.redirect(
        new URL("/onboarding/activate?error=activation_failed", request.url)
      );
    }
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set("bilbax_pending_plan", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
