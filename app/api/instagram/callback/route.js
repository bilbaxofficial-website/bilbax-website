// This runs automatically after the user approves Bilbax on Instagram's page.
// It exchanges the temporary code for an access token, fetches the
// account's username, and saves everything to the database.
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // The user cancelled or Instagram sent an error.
  if (error || !code) {
    return NextResponse.redirect(`${origin}/dashboard?ig_error=1`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    // Step 1: exchange the temporary code for a short-lived access token.
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
      return NextResponse.redirect(`${origin}/dashboard?ig_error=1`);
    }

    // Step 2: fetch the connected account's basic info (username).
    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`
    );
    const profileData = await profileResponse.json();

    // Step 3: save the connection to the database.
    await supabase.from("instagram_accounts").upsert(
      {
        user_id: user.id,
        ig_user_id: profileData.id,
        ig_username: profileData.username,
        access_token: tokenData.access_token,
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (err) {
    console.error("Instagram connect error:", err);
    return NextResponse.redirect(`${origin}/dashboard?ig_error=1`);
  }
}
