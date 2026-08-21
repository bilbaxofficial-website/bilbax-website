// Fetches a single post's details (thumbnail, caption) by media ID, for
// showing a small preview next to a post-locked automation in the list.
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get("id");
  const accessToken = searchParams.get("token");

  if (!mediaId || !accessToken) {
    return NextResponse.json({ error: "Missing id or token" }, { status: 400 });
  }

  try {
    const fields = "id,caption,media_type,media_url,thumbnail_url,permalink";
    const res = await fetch(
      `https://graph.instagram.com/${mediaId}?fields=${fields}&access_token=${accessToken}`
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 502 });
    }

    return NextResponse.json({
      id: data.id,
      caption: data.caption || "",
      thumbnailUrl: data.media_type === "VIDEO" ? data.thumbnail_url : data.media_url,
      permalink: data.permalink,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}
