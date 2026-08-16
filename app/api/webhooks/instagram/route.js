import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function POST(request) {
  const body = await request.json();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const entries = body.entry || [];
    for (const entry of entries) {
      const igAccountId = String(entry.id).trim();
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "comments") continue;

        const commenterId = change.value?.from?.id;
        const commenterUsername = change.value?.from?.username;
        const commentId = change.value?.id;
        const commentText = change.value?.text || "";

        // 🛑 INFINITE LOOP FIX: Agar comment bot ne khud kiya hai, toh ignore karo
        if (commenterId === igAccountId) {
          console.log("STOPPED: Bot apne hi comment par reply nahi karega.");
          continue; 
        }

        console.log("New comment from:", commenterUsername, "| ID:", commenterId);

        // Fetch account
        const { data: account } = await supabase
          .from("instagram_accounts")
          .select("id, access_token")
          .eq("ig_user_id", igAccountId)
          .maybeSingle();

        if (!account) continue;

        // Fetch active automations
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

        // Send DM
        const firstName = commenterUsername || "there";
        const personalizedMessage = matched.dm_message.replace(/\{first_name\}/g, firstName);

        await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { comment_id: commentId },
            message: { text: personalizedMessage },
            access_token: account.access_token,
          }),
        });

        // Reply Publicly
        if (matched.comment_reply) {
          await fetch(`https://graph.instagram.com/v21.0/${commentId}/replies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: matched.comment_reply,
              access_token: account.access_token,
            }),
          });
        }

        // Log message
        await supabase.from("message_logs").insert({
          automation_id: matched.id,
          commenter_ig_id: commenterId,
          commenter_username: commenterUsername,
          dm_sent: true
        });
      }
    }
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
