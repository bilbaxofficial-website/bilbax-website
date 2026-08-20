// This runs automatically after the user approves Bilbax on Instagram's page.
// It exchanges the temporary code for an access token, fetches the
// account's username, and saves everything to the database.
//
// Multi-account support: a user can connect up to 5 Instagram accounts.
// Connecting a new one no longer overwrites an existing connection -
// each becomes its own row. Reconnecting the SAME Instagram account
// (e.g. to refresh an expired token) still updates that one row.
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";

const MAX_ACCOUNTS_PER_USER = 5;

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

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

    // Step 2: fetch the connected account's basic info.
    // Use user_id (the Business Account ID used by webhooks), not id -
    // these are different Instagram ID namespaces, see earlier fix notes.
    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,user_id,username&access_token=${tokenData.access_token}`
    );
    const profileData = await profileResponse.json();
    const igUserId = profileData.user_id || profileData.id;

    if (!profileData.user_id) {
      console.error("WARNING: Instagram /me did not return user_id, falling back to id.", profileData);
    }

    // Step 3: is this Instagram account already connected to this user?
    // (e.g. they're reconnecting to refresh a token) - if so, update that
    // row instead of adding a duplicate.
    const { data: existing } = await supabase
      .from("instagram_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("ig_user_id", igUserId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("instagram_accounts")
        .update({
          ig_username: profileData.username,
          access_token: tokenData.access_token,
        })
        .eq("id", existing.id);

      return NextResponse.redirect(`${origin}/dashboard`);
    }

    // Step 4: it's a genuinely new account for this user - check the limit
    // before adding it.
    const { count } = await supabase
      .from("instagram_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count || 0) >= MAX_ACCOUNTS_PER_USER) {
      return NextResponse.redirect(`${origin}/dashboard?ig_error=account_limit`);
    }

    // Step 5: is this Instagram account already connected to a DIFFERENT
    // Bilbax user? Each Instagram account can only be linked to one
    // Bilbax account (this also matches the database's unique constraint
    // on ig_user_id).
    const { data: connectedElsewhere } = await supabase
      .from("instagram_accounts")
      .select("id")
      .eq("ig_user_id", igUserId)
      .maybeSingle();

    if (connectedElsewhere) {
      return NextResponse.redirect(`${origin}/dashboard?ig_error=already_connected`);
    }

    // Step 6: save the new connection.
    const { error: insertError } = await supabase.from("instagram_accounts").insert({
      user_id: user.id,
      ig_user_id: igUserId,
      ig_username: profileData.username,
      access_token: tokenData.access_token,
    });

    if (insertError) {
      console.error("Instagram account insert error:", insertError);
      return NextResponse.redirect(`${origin}/dashboard?ig_error=1`);
    }

    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (err) {
    console.error("Instagram connect error:", err);
    return NextResponse.redirect(`${origin}/dashboard?ig_error=1`);
  }
}
