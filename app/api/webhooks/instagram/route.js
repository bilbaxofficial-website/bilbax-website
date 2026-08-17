import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase-server";

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

async function callSendAPI(igAccountId, accessToken, recipient, message) {
  const res = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient, message, access_token: accessToken }),
  });
  const data = await res.json();
  console.log("Send DM result:", data);
  return !data.error;
}

async function sendFirstTextDM(igAccountId, accessToken, commentId, text) {
  return callSendAPI(igAccountId, accessToken, { comment_id: commentId }, { text });
}

async function sendFinalMessage(igAccountId, accessToken, automation, recipient, firstName) {
  const text = automation.dm_message.replace(/\{first_name\}/g, firstName);

  // Check for dynamic buttons array or legacy fallback
  const buttonList = Array.isArray(automation.buttons) && automation.buttons.length > 0
    ? automation.buttons
    : (automation.button_title && automation.button_url 
        ? [{ title: automation.button_title, url: automation.button_url }] 
        : []);

  if (buttonList.length > 0) {
    // Meta Instagram API Button Template accepts up to 3 buttons per card natively
    const payloadButtons = buttonList.slice(0, 3).map((b) => ({
      type: "web_url",
      url: b.url,
      title: b.title.slice(0, 20),
    }));

    return callSendAPI(igAccountId, accessToken, recipient, {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text,
          buttons: payloadButtons,
        },
      },
    });
  }

  return callSendAPI(igAccountId, accessToken, recipient, { text });
}

async function sendFollowGateDM(igAccountId, accessToken, recipient, promptText) {
  return callSendAPI(igAccountId, accessToken, recipient, {
    text: promptText,
    quick_replies: [
      { content_type: "text", title: "✅ I followed, unlock now", payload: "BILBAX_FOLLOW_CHECK" },
    ],
  });
}

async function checkIsFollower() {
  return true;
}

export async function POST(request) {
  const body = await request.json();
  console.log("WEBHOOK BODY:", JSON.stringify(body));
  const supabase = await createClient();

  try {
    const entries = body.entry || [];

    for (const entry of entries) {
      const igAccountId = entry.id;
      const changes = entry.changes || [];
      const messaging = entry.messaging || [];

      // --- Comment events ---
      for (const change of changes) {
        if (change.field !== "comments") continue;

        const commentText = change.value?.text || "";
        const commenterId = change.value?.from?.id;
        const commenterUsername = change.value?.from?.username;
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
          const lower = commentText.toLowerCase();
          return a.keywords.some((kw) => lower.includes(kw.toLowerCase()));
        });
        if (!matched) continue;

        if (matched.comment_reply) {
          try {
            await fetch(`https://graph.instagram.com/v21.0/${commentId}/replies`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: matched.comment_reply, access_token: account.access_token }),
            });
          } catch {}
        }

        const recipient = { comment_id: commentId };

        // Step 1: follow gate.
        if (matched.require_follow) {
          const sent = await sendFollowGateDM(igAccountId, account.access_token, recipient, matched.follow_prompt);
          if (sent) {
            await supabase.from("conversation_state").insert({
              automation_id: matched.id,
              ig_account_id: account.id,
              commenter_ig_id: commenterId,
              commenter_username: commenterUsername,
              status: "awaiting_follow",
            });
          }
          continue;
        }

        // Step 2: data collection gate.
        if (matched.collect_field) {
          const sent = await sendFirstTextDM(igAccountId, account.access_token, commentId, matched.collect_prompt);
          if (sent) {
            await supabase.from("conversation_state").insert({
              automation_id: matched.id,
              ig_account_id: account.id,
              commenter_ig_id: commenterId,
              commenter_username: commenterUsername,
              status: "awaiting_data",
            });
          }
          continue;
        }

        // No gates - send the final message right away
        const firstName = commenterUsername || "there";
        const dmSent = await sendFinalMessage(igAccountId, account.access_token, matched, recipient, firstName);

        await supabase.from("message_logs").insert({
          automation_id: matched.id,
          commenter_ig_id: commenterId,
          commenter_username: commenterUsername,
          matched_keyword: matched.keywords.includes("*") ? "*" : matched.keywords[0],
          dm_sent: dmSent,
        });
      }

      // --- Incoming DM replies ---
      for (const msg of messaging) {
        const senderId = msg.sender?.id;
        const text = msg.message?.text;
        if (!senderId || !text) continue;

        const { data: account } = await supabase
          .from("instagram_accounts")
          .select("id, access_token")
          .eq("ig_user_id", igAccountId)
          .maybeSingle();
        if (!account) continue;

        const { data: pending } = await supabase
          .from("conversation_state")
          .select("*, automations(*)")
          .eq("ig_account_id", account.id)
          .eq("commenter_ig_id", senderId)
          .in("status", ["awaiting_follow", "awaiting_data"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!pending) continue;
        const automation = pending.automations;
        if (!automation) continue;
        const firstName = pending.commenter_username || "there";
        const recipient = { id: senderId };

        if (pending.status === "awaiting_follow") {
          const isFollower = await checkIsFollower();

          if (isFollower) {
            await supabase
              .from("conversation_state")
              .update({ status: "completed", updated_at: new Date().toISOString() })
              .eq("id", pending.id);

            const dmSent = await sendFinalMessage(igAccountId, account.access_token, automation, recipient, firstName);

            await supabase.from("message_logs").insert({
              automation_id: automation.id,
              commenter_ig_id: senderId,
              commenter_username: pending.commenter_username,
              matched_keyword: "follow_verified",
              dm_sent: dmSent,
            });
          } else {
            await sendFollowGateDM(igAccountId, account.access_token, recipient, automation.follow_prompt);
          }
          continue;
        }

        if (pending.status === "awaiting_data") {
          await supabase
            .from("conversation_state")
            .update({ status: "completed", collected_value: text, updated_at: new Date().toISOString() })
            .eq("id", pending.id);

          await supabase.from("message_logs").insert({
            automation_id: automation.id,
            commenter_ig_id: senderId,
            commenter_username: pending.commenter_username,
            matched_keyword: "data_collected",
            dm_sent: true,
            collected_value: text,
          });

          await sendFinalMessage(igAccountId, account.access_token, automation, recipient, firstName);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
