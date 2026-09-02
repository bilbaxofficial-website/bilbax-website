import { NextResponse } from "next/server";

const VALID_PLANS = new Set(["free", "starter", "growth", "pro"]);

export async function GET(request) {
  const { origin, searchParams } = new URL(request.url);
  const onboarding = searchParams.get("onboarding") === "1";
  const plan = (searchParams.get("plan") || "").toLowerCase();

  const redirectUri = `${origin}/api/instagram/callback`;
  const scopes = [
    "instagram_business_basic",
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
  ].join(",");

  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", process.env.META_APP_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(authUrl.toString());

  if (onboarding && VALID_PLANS.has(plan)) {
    response.cookies.set("bilbax_onboarding_plan", plan, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });
  }

  return response;
}
