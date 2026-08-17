import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service Role Client (RLS bypass karke background webhooks ko DB access deta hai)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

// Helper: Meta Instagram Graph API Call
async function callSendAPI(igAccountId, accessToken, recipient, message) {
  console.log("📤 Sending DM via Meta API...", { recipient, message });
  try {
    const res = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, message, access_token: accessToken }),
    });
    const data = await res.json();
    console.log("📩 Meta Send API Response:", JSON.stringify(data));
    return !data.error;
  } catch (err) {
    console.error("❌ Send API Fetch Error:", err);
    return false;
  }
}

async function sendFirstTextDM(igAccountId, accessToken, commentId, text) {
  return callSendAPI(igAccountId, accessToken, { comment_id: commentId }, { text });
}

async function sendFinalMessage(igAccountId, accessToken, automation, recipient, firstName) {
  const text = (automation.dm_message || "").replace(/\{first_name\}/g, firstName);

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

async function sendFollowGateDM(igAccountId, accessToken, recipient, promptText) {
  return callSendAPI(igAccountId, accessToken, recipient, {
    text: promptText,
    quick_replies: [
      { content_type: "text", title: "✅ I followed, unlock now", payload: "BILBAX_FOLLOW_CHECK" },
    ],
  });
}

// Real Meta Graph API check to verify if user actually follows the account
async function checkIsFollower(igAccountId, accessToken, commenterIgId) {
  try {
    const res = await fetch(
      `https://graph.instagram.com/v21.0/${commenterIgId}?fields=follows_you&access_token=${accessToken}`
    );
    const data = await res.json();
    console.log("🔍 Follow verification response:", data);

    if (data && typeof data.follows_you === "boolean") {
      return data.follows_you;
    }
    return false;
  } catch (err) {
    console.error("❌ Follow check failed:", err);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("🚀 FULL WEBHOOK BODY RECEIVED:", JSON.stringify(body, null, 2));

    const entries = body.entry || [];

    for (const entry of entries) {
      const igAccountId = String(entry.id || "").trim();
      console.log("📌 Step 1: Processing Meta Account ID:", igAccountId);

      const changes = entry.changes || [];
      const messaging = entry.messaging || [];

      // ----------------- 1. COMMENTS PROCESSOR -----------------
      for (const change of changes) {
        if (change.field !== "comments") {
          console.log("ℹ️ Skipping non-comment field:", change.field);
          continue;
        }

        const commentVal = change.value || {};
        const commentText = (commentVal.text || "").trim();
        const commenterId = commentVal.from?.id;
        const commenterUsername = commentVal.from?.username;
        const commentId = commentVal.id;

        console.log("💬 Step 2: New Comment Detected:", { commentText, commenterId, commenterUsername, commentId });

        // Query Database with Service Role (Bypasses RLS)
        const { data: account, error: accountErr } = await supabase
          .from("instagram_accounts")
          .select("id, access_token, ig_user_id")
          .eq("ig_user_id", igAccountId)
          .maybeSingle();

        if (accountErr || !account) {
          console.error("❌ Step 3 FAIL: Account not found in Database for ig_user_id:", igAccountId, "DB Error:", accountErr);
          const { data: allAccounts } = await supabase.from("instagram_accounts").select("id, ig_user_id");
          console.log("📋 Registered DB IG User IDs:", allAccounts);
          continue;
        }

        console.log("✅ Step 3 SUCCESS: Matched DB Account UUID:", account.id);

        // Fetch active automations for this account
        const { data: automations, error: autoErr } = await supabase
          .from("automations")
          .select("*")
          .eq("ig_account_id", account.id)
          .eq("status", "active");

        if (autoErr || !automations || automations.length === 0) {
          console.error("⚠️ Step 4 FAIL: No active automations found for account:", account.id, "Error:", autoErr);
          continue;
        }

        console.log(`🤖 Step 4 SUCCESS: Found ${automations.length} active automation(s)`);

        // Keyword Matcher Logic
        const matched = automations.find((a) => {
          const kwList = Array.isArray(a.keywords) ? a.keywords : [];
          if (kwList.includes("*")) return true;
          
          const lowerText = commentText.toLowerCase();
          return kwList.some((kw) => lowerText.includes(String(kw).toLowerCase().trim()));
        });

        if (!matched) {
          console.log(`⚠️ Step 5 FAIL: Comment "${commentText}" did not match any active keyword.`);
          continue;
        }

        console.log("🎯 Step 5 SUCCESS: Matched Automation ID:", matched.id);

        // Public Comment Reply (if configured)
        if (matched.comment_reply) {
          try {
            console.log("💬 Replying publicly to comment:", matched.comment_reply);
            await fetch(`https://graph.instagram.com/v21.0/${commentId}/replies`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: matched.comment_reply, access_token: account.access_token }),
            });
          } catch (e) {
            console.error("❌ Public reply failed:", e);
          }
        }

        const recipient = { comment_id: commentId };

        // Gate 1: Follow Requirement
        if (matched.require_follow) {
          console.log("🔒 Triggering Follow Gate...");
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

        // Gate 2: Data Collection Requirement
        if (matched.collect_field) {
          console.log("🔒 Triggering Data Collection Gate...");
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

        // Direct DM Sending (No Gates)
        console.log("✉️ Sending direct final DM...");
        const firstName = commenterUsername || "there";
        const dmSent = await sendFinalMessage(igAccountId, account.access_token, matched, recipient, firstName);

        await supabase.from("message_logs").insert({
          automation_id: matched.id,
          commenter_ig_id: commenterId,
          commenter_username: commenterUsername,
          matched_keyword: matched.keywords.includes("*") ? "*" : matched.keywords[0],
          dm_sent: dmSent,
        });
        
        console.log("🎉 Automation completed successfully!");
      }

      // ----------------- 2. INCOMING DM RESPONSES -----------------
      for (const msg of messaging) {
        const senderId = msg.sender?.id;
        const text = (msg.message?.text || "").trim();
        if (!senderId || !text) continue;

        console.log("📩 Incoming Direct Message from user:", senderId, "Text:", text);

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

        if (!pending || !pending.automations) continue;
        const automation = pending.automations;
        const firstName = pending.commenter_username || "there";
        const recipient = { id: senderId };

        if (pending.status === "awaiting_follow") {
          // Verify actual follow status via Meta API
          const isFollower = await checkIsFollower(igAccountId, account.access_token, senderId);

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
            // User hasn't followed yet -> Re-prompt warning message
            await sendFollowGateDM(
              igAccountId,
              account.access_token,
              recipient,
              "❌ Aapne abhi tak follow nahi kiya hai! Pehle account ko follow karein, fir iss button par click karein."
            );
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

          await sendFinalMessage(igAccountId, account.access_token, matched, recipient, firstName);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("🔥 CRITICAL WEBHOOK ERROR:", err);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
