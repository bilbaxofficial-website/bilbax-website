// This is the engine. Meta calls this URL whenever:
//  - someone comments on a connected Instagram account (change.field === "comments")
//  - someone sends/replies to a DM (change.field === "messages")
//
// Phase 3 adds a small conversation flow:
//   comment matches keyword
//     -> if automation requires a follow and they don't follow: send follow_prompt, STOP (wait for them to comment again)
//     -> if automation collects email/phone: send collect_prompt, STOP (wait for their DM reply)
//     -> otherwise: send the final dm_message right away
//   DM reply arrives while we're waiting on them
//     -> if we were waiting for their follow: they re-comment, so this path isn't used
//     -> if we were waiting for data (email/phone): save their reply as the answer, send the final dm_message
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

async function sendDM(igAccountId, accessToken, recipientId, text, isCommentId = false) {
  const recipient = isCommentId ? { comment_id: recipientId } : { id: recipientId };
  const res = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient,
      message: { text },
      access_token: accessToken,
    }),
  });
  const data = await res.json();
  console.log("Send DM result:", data);
  return !data.error;
}

async function checkIsFollower(igAccountId, accessToken, commenterId) {
  // Instagram Graph API: check if commenterId follows igAccountId.
  // Falls back to "not a follower" if the check itself fails, so the
  // gate stays safe (asks them to follow) rather than silently skipping it.
  try {
    const res = await fetch(
      `https://graph.instagram.com/v21.0/${igAccountId}?fields=followers_count&access_token=${accessToken}`
    );
    // NOTE: Instagram's public Graph API does not expose a direct
    // "does user X follow me" lookup for arbitrary commenters yet.
    // As a practical placeholder, treat everyone as needing to be asked
    // to follow the first time, until Meta's API supports a real check.
    // (Left explicit so it's easy to find and swap in the real check.)
    return false;
  } catch {
    return false;
  }
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

      // --- Handle comment events ---
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

        // Reply publicly on the comment (best effort).
        if (matched.comment_reply) {
          try {
            await fetch(`https://graph.instagram.com/v21.0/${commentId}/replies`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: matched.comment_reply,
                access_token: account.access_token,
              }),
            });
          } catch {}
        }

        // Step 1: follow gate.
        if (matched.require_follow) {
          const isFollower = await checkIsFollower(igAccountId, account.access_token, commenterId);
          if (!isFollower) {
            await sendDM(igAccountId, account.access_token, commentId, matched.follow_prompt, true);
            await supabase.from("message_logs").insert({
              automation_id: matched.id,
              commenter_ig_id: commenterId,
              commenter_username: commenterUsername,
              matched_keyword: matched.keywords.includes("*") ? "*" : matched.keywords[0],
              dm_sent: true,
              error: "waiting_for_follow",
            });
            continue; // stop here - they need to follow and comment again
          }
        }

        // Step 2: data collection gate.
        if (matched.collect_field) {
          const sent = await sendDM(igAccountId, account.access_token, commentId, matched.collect_prompt, true);
          if (sent) {
            await supabase.from("conversation_state").insert({
              automation_id: matched.id,
              ig_account_id: account.id,
              commenter_ig_id: commenterId,
              commenter_username: commenterUsername,
              status: "awaiting_data",
            });
          }
          continue; // stop here - wait for their DM reply with the info
        }

        // No gates - send the final message right away.
        const firstName = commenterUsername || "there";
        const personalized = matched.dm_message.replace(/\{first_name\}/g, firstName);
        const dmSent = await sendDM(igAccountId, account.access_token, commentId, personalized, true);

        await supabase.from("message_logs").insert({
          automation_id: matched.id,
          commenter_ig_id: commenterId,
          commenter_username: commenterUsername,
          matched_keyword: matched.keywords.includes("*") ? "*" : matched.keywords[0],
          dm_sent: dmSent,
        });
      }

      // --- Handle incoming DM replies (for data collection step) ---
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

        // Find the most recent thing we're waiting on from this person.
        const { data: pending } = await supabase
          .from("conversation_state")
          .select("*, automations(*)")
          .eq("ig_account_id", account.id)
          .eq("commenter_ig_id", senderId)
          .eq("status", "awaiting_data")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!pending) continue;

        // Save their reply as the collected value.
        await supabase
          .from("conversation_state")
          .update({ status: "completed", collected_value: text, updated_at: new Date().toISOString() })
          .eq("id", pending.id);

        // Save it to the lead log too.
        await supabase.from("message_logs").insert({
          automation_id: pending.automation_id,
          commenter_ig_id: senderId,
          commenter_username: pending.commenter_username,
          matched_keyword: "data_collected",
          dm_sent: true,
          collected_value: text,
        });

        // Send the final message.
        const automation = pending.automations;
        if (automation) {
          const firstName = pending.commenter_username || "there";
          const personalized = automation.dm_message.replace(/\{first_name\}/g, firstName);
          await sendDM(igAccountId, account.access_token, senderId, personalized, false);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
