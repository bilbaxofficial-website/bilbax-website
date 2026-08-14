// This runs when the user clicks "Connect Instagram" on the dashboard.
// It sends them to Meta's Instagram login page to authorize Bilbax.
import { NextResponse } from "next/server";

export async function GET(request) {
  const { origin } = new URL(request.url);

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

  return NextResponse.redirect(authUrl.toString());
}
