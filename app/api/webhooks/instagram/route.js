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
    console.log("🚀 SENDING API CALL TO:", recipient.id || recipient.comment_id);
    const res = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, message, access_token: accessToken }),
    });
    const data = await res.json();
    if (data.error) {
      console.error("❌ META API ERROR:", data.error.message);
    } else {
      console.log("✅ MESSAGE SENT SUCCESSFULLY!");
    }
    return !data.error;
  } catch (err) {
    console.error("❌ FETCH ERROR:", err);
    return false;
  }
}

// STEP 1: Pehla follow prompt
async function sendFirstFollowGate(igAccountId, accessToken, recipient, promptText) {
  return callSendAPI(igAccountId, accessToken, recipient, {
    text: promptText || "Follow me first, then tap the button below!",
    quick_replies: [
      // ⚠️ IMPORTANT: Max 20 characters allowed by Meta for title!
      { content_type: "text", title: "✅ Yes, I Followed", payload: "FIRST_FOLLOW_CHECK" },
    ],
  });
}

// STEP 2: Profile Link + Second Button Gate
async function sendSecondProfileGate(igAccountId, accessToken, recipient, creatorUsername) {
  await delay(2000);
  const profileUrl = `https://instagram.com/${creatorUsername}`;

  return callSendAPI(igAccountId, accessToken, recipient, {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: `Please check if you follow @${creatorUsername}! Click below to verify or follow, then unlock your link.`,
        buttons: [
          { type: "web_url", url: profileUrl, title: "📲 Click to Follow" },
          { type: "postback", title: "✅ Unlock Link", payload: "SECOND_FOLLOW_CONFIRMED" },
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
      attachment: { type: "template", payload: { template_type: "button", text, buttons: payloadButtons } },
    });
  }

  return callSendAPI(igAccountId, accessToken, recipient, { text });
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("-----------------------------------------");
    console.log("📥 NEW WEBHOOK RECEIVED:", JSON.stringify(body).slice(0, 300));
    const entries = body.entry || [];

    for (const entry of entries) {
      const igAccountId = String(entry.id || "").trim();
      const changes = entry.changes || [];
      const messaging = entry.messaging || [];

      // ------------- 1. COMMENTS PROCESSOR -------------
      for (const change of changes) {
        if (change.field !== "comments") continue;
        
        const commentVal = change.value || {};
        const commentText = (commentVal.text || "").trim();
        const commenterId = commentVal.from?.id;
        const commenterUsername = commentVal.from?.username;
        const commentId = commentVal.id;

        console.log(`💬 COMMENT DETECTED: "${commentText}" from User IG_ID: ${commenterId}`);
        console.log(`🔍 SEARCHING DB FOR ACCOUNT ID: ${igAccountId}`);

        const { data: account } = await supabase
          .from("instagram_accounts")
          .select("id, access_token, username, ig_user_id")
          .eq("ig_user_id", igAccountId)
          .maybeSingle();

        if (!account) {
          console.log("🛑 STOP: ig_user_id database mein nahi mila!");
          continue;
        }
        
        console.log("✅ ACCOUNT FOUND IN DB:", account.username);

        const { data: automations } = await supabase
          .from("automations")
          .select("*")
          .eq("ig_account_id", account.id)
          .eq("status", "active");

        if (!automations || automations.length === 0) {
          console.log("🛑 STOP: Koi active automation nahi mili is account ke liye!");
          continue;
        }

        const matched = automations.find((a) => {
          const kwList = Array.isArray(a.keywords) ? a.keywords : [];
          if (kwList.includes("*")) return true;
          return kwList.some((kw) => commentText.toLowerCase().includes(String(kw).toLowerCase().trim()));
        });

        if (!matched) {
          console.log(`🛑 STOP: Comment "${commentText}" kisi keyword se match nahi hua!`);
          continue;
        }
        
        console.log("✅ AUTOMATION MATCHED:", matched.id);

        if (!commenterId) {
           console.log("⚠️ WARNING: Commenter ka ID null hai. Shayad app me permissions kam hain.");
           continue;
        }

        const recipient = { comment_id: commentId };

        if (matched.require_follow) {
          console.log("🔄 FLOW: Require Follow ENABLED, Sending First Gate...");
          const sent = await sendFirstFollowGate(igAccountId, account.access_token, recipient, matched.follow_prompt);
          if (sent) {
            await supabase.from("conversation_state").insert({
              automation_id: matched.id,
              ig_account_id: account.id,
              commenter_ig_id: commenterId,
              commenter_username: commenterUsername,
              status: "awaiting_first_click",
            });
            console.log("✅ DB STATE UPDATED: awaiting_first_click");
          }
          continue;
        }

        console.log("🔄 FLOW: Direct send link (Follow not required)...");
        await sendFinalMessage(igAccountId, account.access_token, matched, recipient, commenterUsername || "there");
      }

      // ------------- 2. DM / BUTTON CLICKS PROCESSOR -------------
      for (const msg of messaging) {
        const senderId = msg.sender?.id;
        const textPayload = msg.message?.quick_reply?.payload || msg.postback?.payload || (msg.message?.text || "").trim();
        
        if (!senderId) continue;
        console.log(`📩 INBOX EVENT: Sender=${senderId} | Payload/Text=${textPayload}`);

        const { data: account } = await supabase
          .from("instagram_accounts")
          .select("id, access_token, username")
          .eq("ig_user_id", igAccountId)
          .maybeSingle();

        if (!account) continue;

        const { data: pending } = await supabase
          .from("conversation_state")
          .select("*, automations(*)")
          .eq("ig_account_id", account.id)
          .eq("commenter_ig_id", senderId)
          .in("status", ["awaiting_first_click", "awaiting_second_click"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!pending || !pending.automations) {
           console.log("🛑 STOP: Is user ke liye DB mein koi pending state nahi hai.");
           continue;
        }

        const automation = pending.automations;
        const recipient = { id: senderId };

        // FIRST GATE CLICKED
        if (pending.status === "awaiting_first_click" && (textPayload === "FIRST_FOLLOW_CHECK" || textPayload.toLowerCase().includes("followed"))) {
          console.log("✅ FIRST GATE PASSED! Wait for 2 sec, sending Second Gate...");
          await supabase.from("conversation_state").update({ status: "awaiting_second_click", updated_at: new Date().toISOString() }).eq("id", pending.id);
          await sendSecondProfileGate(igAccountId, account.access_token, recipient, account.username || "instagram");
          continue;
        }

        // SECOND GATE CLICKED
        if (pending.status === "awaiting_second_click" && (textPayload === "SECOND_FOLLOW_CONFIRMED" || textPayload.toLowerCase().includes("yes"))) {
           console.log("✅ SECOND GATE PASSED! Sending Final Link...");
           await supabase.from("conversation_state").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", pending.id);
           await sendFinalMessage(igAccountId, account.access_token, automation, recipient, pending.commenter_username || "there");
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("🔥 FATAL WEBHOOK ERROR:", err);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
