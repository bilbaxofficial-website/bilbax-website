// Fetches the connected Instagram account's own posts and reels, so the
// automation form can show a picker grid. Stories are NOT included here -
// Instagram's API keeps stories on a separate edge (/me/stories) since
// they expire after 24h and work differently. See the stories route for that.
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account");

  if (!accountId) {
    return NextResponse.json({ error: "Missing account id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Security: only let a user fetch media for an Instagram account that
  // actually belongs to them.
  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("id, access_token")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=${fields}&limit=30&access_token=${account.access_token}`
    );
    const data = await res.json();

    if (data.error) {
      console.error("Instagram media fetch error:", data.error);
      return NextResponse.json({ error: data.error.message }, { status: 502 });
    }

    // Normalize so the picker always has a thumbnail to show, even for
    // videos/reels (which use thumbnail_url instead of media_url).
    const posts = (data.data || []).map((item) => ({
      id: item.id,
      caption: item.caption || "",
      mediaType: item.media_type, // IMAGE | VIDEO | CAROUSEL_ALBUM
      thumbnailUrl: item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url,
      permalink: item.permalink,
      timestamp: item.timestamp,
    }));

    return NextResponse.json({ posts });
  } catch (err) {
    console.error("Instagram media fetch exception:", err);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
