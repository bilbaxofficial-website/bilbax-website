// This is the engine. Meta calls this URL every time someone comments on
// a connected Instagram account. We check if any automation's keyword
// matches, and if so, send the DM.
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";

// Meta calls this once, when you first set up the webhook, to verify you own this URL.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Meta calls this every time a real comment happens.
export async function POST(request) {
  const body = await request.json();
  const supabase = await createClient();

  try {
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "comments") continue;

        const commentText = change.value?.text || "";
        const commenterId = change.value?.from?.id;
        const commenterUsername = change.value?.from?.username;
        const igAccountId = entry.id;
        const commentId = change.value?.id;

        const { data: account } = await supabase
          .from("instagram_accounts")
          .select("id, access_token")
          .eq("ig_user_id", igAccountId)
          .maybeSingle();

        if (!account) continue;

        const { data: automations } = await supabase
          .from("automations")
          .select("*")
          .eq("ig_account_id", account.id)
          .eq("status", "active");

        if (!automations || automations.length === 0) continue;

        const matched = automations.find((a) => {
          if (a.keywords.includes("*")) return true;
          const lowerComment = commentText.toLowerCase();
          return a.keywords.some((kw) => lowerComment.includes(kw.toLowerCase()));
        });

        if (!matched) continue;

        const firstName = commenterUsername || "there";
        const personalizedMessage = matched.dm_message.replace(
          /\{first_name\}/g,
          firstName
        );

        let dmSent = false;
        let errorMsg = null;
        try {
          const sendResponse = await fetch(
            `https://graph.instagram.com/v21.0/${igAccountId}/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { comment_id: commentId },
                message: { text: personalizedMessage },
                access_token: account.access_token,
              }),
            }
          );
          const sendData = await sendResponse.json();
          dmSent = !sendData.error;
          if (sendData.error) errorMsg = JSON.stringify(sendData.error);
        } catch (err) {
          errorMsg = String(err);
        }

        if (matched.comment_reply) {
          try {
            await fetch(
              `https://graph.instagram.com/v21.0/${commentId}/replies`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: matched.comment_reply,
                  access_token: account.access_token,
                }),
              }
            );
          } catch (err) {
            // Non-critical
          }
        }

        await supabase.from("message_logs").insert({
          automation_id: matched.id,
          commenter_ig_id: commenterId,
          commenter_username: commenterUsername,
          matched_keyword: matched.keywords.includes("*") ? "*" : matched.keywords[0],
          dm_sent: dmSent,
          error: errorMsg,
        });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
