import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  try {
    const res = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, message, access_token: accessToken }),
    });
    const data = await res.json();
    return !data.error;
  } catch (err) {
    console.error("❌ Send API Error:", err);
    return false;
  }
}

// STEP 1: Pehla follow prompt (Quick Reply Button)
async function sendFirstFollowGate(igAccountId, accessToken, recipient, promptText) {
  return callSendAPI(igAccountId, accessToken, recipient, {
    text: promptText || "Follow me first, then tap the button below and I'll send it right over! 🙌",
    quick_replies: [
      { content_type: "text", title: "✅ I followed, unlock...", payload: "FIRST_FOLLOW_CHECK" },
    ],
  });
}

// STEP 2: 2 second delay ke baad Profile Link + Second Button Gate
async function sendSecondProfileGate(igAccountId, accessToken, recipient, creatorUsername) {
  await delay(2000); // 2 Second Pause

  const profileUrl = `https://instagram.com/${creatorUsername}`;

  return callSendAPI(igAccountId, accessToken, recipient, {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: `Please check if you follow @${creatorUsername}! Click below to verify or follow, then unlock your link.`,
        buttons: [
          {
            type: "web_url",
            url: profileUrl,
            title: "📲 Click to Follow",
          },
          {
            type: "postback",
            title: "✅ Yes, I Followed",
            payload: "SECOND_FOLLOW_CONFIRMED",
          },
        ],
      },
    },
  });
}

// STEP 3: Final Link Delivery
async function sendFinalMessage(igAccountId, accessToken, automation, recipient, firstName) {
  const text = (automation.dm_message || "Here is your link!").replace(/\{first_name\}/g, firstName);

  const buttonList = Array.isArray(automation.buttons) && automation.buttons.length > 0
    ? automation.buttons
    : (automation.button_title && automation.button_url 
        ? [{ title: automation.button_title, url: automation.button_url }] 
        : []);

  if (buttonList.length > 0) {
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

export async function POST(request) {
  try {
    const body = await request.json();
    const entries = body.entry || [];

    for (const entry of entries) {
      const igAccountId = String(entry.id || "").trim();
      const changes = entry.changes || [];
      const messaging = entry.messaging || [];

      // ----------------- 1. COMMENTS PROCESSOR -----------------
      for (const change of changes) {
        if (change.field !== "comments") continue;

        const commentVal = change.value || {};
        const commentText = (commentVal.text || "").trim();
        const commenterId = commentVal.from?.id;
        const commenterUsername = commentVal.from?.username;
        const commentId = commentVal.id;

        const { data: account } = await supabase
          .from("instagram_accounts")
          .select("id, access_token, username, ig_user_id")
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
          const kwList = Array.isArray(a.keywords) ? a.keywords : [];
          if (kwList.includes("*")) return true;
          const lowerText = commentText.toLowerCase();
          return kwList.some((kw) => lowerText.includes(String(kw).toLowerCase().trim()));
        });

        if (!matched) continue;

        if (matched.comment_reply) {
          try {
            await fetch(`https://graph.instagram.com/v21.0/${commentId}/replies`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: matched.comment_reply, access_token: account.access_token }),
            });
          } catch (e) {}
        }

        const recipient = { comment_id: commentId };

        if (matched.require_follow) {
          const sent = await sendFirstFollowGate(igAccountId, account.access_token, recipient, matched.follow_prompt);
          if (sent) {
            await supabase.from("conversation_state").insert({
              automation_id: matched.id,
              ig_account_id: account.id,
              commenter_ig_id: commenterId,
              commenter_username: commenterUsername,
              status: "awaiting_first_click",
            });
          }
          continue;
        }

        // Direct Send
        const firstName = commenterUsername || "there";
        await sendFinalMessage(igAccountId, account.access_token, matched, recipient, firstName);
      }

      // ----------------- 2. INCOMING DM / BUTTON CLICKS -----------------
      for (const msg of messaging) {
        const senderId = msg.sender?.id;
        const textPayload = msg.message?.quick_reply?.payload || msg.postback?.payload || (msg.message?.text || "").trim();
        
        if (!senderId) continue;

        const { data: account } = await supabase
          .from("instagram_accounts")
          .select("id, access_token, username")
          .eq("ig_user_id", igAccountId)
          .maybeSingle();

        if (!account) continue;

        // FETCH ACTIVE STATE
        const { data: pending } = await supabase
          .from("conversation_state")
          .select("*, automations(*)")
          .eq("ig_account_id", account.id)
          .eq("commenter_ig_id", senderId)
          .in("status", ["awaiting_first_click", "awaiting_second_click"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!pending || !pending.automations) continue;
        const automation = pending.automations;
        const firstName = pending.commenter_username || "there";
        const recipient = { id: senderId };

        // STEP 1 CLICKED: "✅ I followed, unlock..."
        if (pending.status === "awaiting_first_click" && (textPayload === "FIRST_FOLLOW_CHECK" || textPayload.includes("followed"))) {
          await supabase
            .from("conversation_state")
            .update({ status: "awaiting_second_click", updated_at: new Date().toISOString() })
            .eq("id", pending.id);

          // Creator ka username account table se leke second gate bhejo (with 2 sec delay)
          const creatorUsername = account.username || "instagram";
          await sendSecondProfileGate(igAccountId, account.access_token, recipient, creatorUsername);
          continue;
        }

        // STEP 2 CLICKED: "✅ Yes, I Followed"
        if (pending.status === "awaiting_second_click" && (textPayload === "SECOND_FOLLOW_CONFIRMED" || textPayload.includes("Yes"))) {
          await supabase
            .from("conversation_state")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", pending.id);

          await sendFinalMessage(igAccountId, account.access_token, automation, recipient, firstName);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("🔥 WEBHOOK ERROR:", err);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
