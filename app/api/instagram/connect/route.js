import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";

const MAX_ACCOUNTS_PER_USER = 5;
const VALID_PLANS = new Set(["free", "starter", "growth", "pro"]);

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const onboardingPlan = request.cookies.get("bilbax_onboarding_plan")?.value;
  const isOnboarding = VALID_PLANS.has(onboardingPlan);

  const onboardingErrorRedirect = `${origin}/onboarding/instagram?plan=${encodeURIComponent(
    onboardingPlan || "free"
  )}&ig_error=1`;
  const failRedirect = isOnboarding
    ? onboardingErrorRedirect
    : `${origin}/dashboard?ig_error=1`;

  if (error || !code) {
    return NextResponse.redirect(failRedirect);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    const redirectUri = `${origin}/api/instagram/callback`;
    const tokenResponse = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }),
      }
    );
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error("Instagram token exchange failed:", tokenData);
      return NextResponse.redirect(failRedirect);
    }

    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,user_id,username&access_token=${tokenData.access_token}`
    );
    const profileData = await profileResponse.json();
    const igUserId = profileData.user_id || profileData.id;

    if (!igUserId || !profileData.username) {
      console.error("Instagram profile fetch failed:", profileData);
      return NextResponse.redirect(failRedirect);
    }

    const finish = (connected) => {
      if (isOnboarding && connected) {
        const response = NextResponse.redirect(
          `${origin}/onboarding/activate?plan=${encodeURIComponent(onboardingPlan)}`
        );
        response.cookies.delete("bilbax_onboarding_plan");
        return response;
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    };

    const { data: existing } = await supabase
      .from("instagram_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("ig_user_id", igUserId)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("instagram_accounts")
        .update({
          ig_username: profileData.username,
          access_token: tokenData.access_token,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Instagram account update error:", updateError);
        return NextResponse.redirect(failRedirect);
      }

      return finish(true);
    }

    const { count } = await supabase
      .from("instagram_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count || 0) >= MAX_ACCOUNTS_PER_USER) {
      return NextResponse.redirect(`${origin}/dashboard?ig_error=account_limit`);
    }

    const { data: connectedElsewhere } = await supabase
      .from("instagram_accounts")
      .select("id")
      .eq("ig_user_id", igUserId)
      .maybeSingle();

    if (connectedElsewhere) {
      return NextResponse.redirect(`${origin}/dashboard?ig_error=already_connected`);
    }

    const { error: insertError } = await supabase.from("instagram_accounts").insert({
      user_id: user.id,
      ig_user_id: igUserId,
      ig_username: profileData.username,
      access_token: tokenData.access_token,
    });

    if (insertError) {
      console.error("Instagram account insert error:", insertError);
      return NextResponse.redirect(failRedirect);
    }

    return finish(true);
  } catch (err) {
    console.error("Instagram connect error:", err);
    return NextResponse.redirect(failRedirect);
  }
}
