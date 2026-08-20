import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase client initialize using service role key (bypasses RLS issues)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// GET Method: Meta Webhook Verification
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

// Meta Graph API Message Helper
async function callSendAPI(igAccountId, accessToken, recipient, message) {
  try {
    console.log("🚀 SENDING API CALL TO RECIPIENT:", JSON.stringify(recipient));
    const res = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, message, access_token: accessToken }),
    });
    const data = await res.json();
    if (data.error) {
      console.error("❌ META API ERROR DETAILS:", JSON.stringify(data.error));
    } else {
      console.log("✅ MESSAGE SENT SUCCESSFULLY! Res ID:", data.message_id || "OK");
    }
    return !data.error;
  } catch (err) {
    console.error("❌ FETCH ERROR IN CALLSENDAPI:", err);
    return false;
  }
}

// STEP 1: Pehla follow prompt
async function sendFirstFollowGate(igAccountId, accessToken, recipient, promptText) {
  return callSendAPI(igAccountId, accessToken, recipient, {
    text: promptText || "Follow me first, then tap the button below!",
    quick_replies: [
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

// STEP: Ask for email/phone (plain text DM, waits for a typed reply)
async function sendCollectPrompt(igAccountId, accessToken, recipient, promptText, fieldName) {
  return callSendAPI(igAccountId, accessToken, recipient, {
    text: promptText || `What's the best ${fieldName || "email"} to send this to?`,
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
      title: String(b.title).slice(0, 20),
    }));

    return callSendAPI(igAccountId, accessToken, recipient, {
      attachment: { type: "template", payload: { template_type: "button", text, buttons: payloadButtons } },
    });
  }

  return callSendAPI(igAccountId, accessToken, recipient, { text });
}

// WELCOME MESSAGE: simple text + optional single button, no gates, no follow-ups.
async function sendWelcomeMessage(igAccountId, accessToken, recipient, account) {
  const text = account.welcome_message || "Hey! Thanks for reaching out 👋";

  if (account.welcome_button_title && account.welcome_button_url) {
    return callSendAPI(igAccountId, accessToken, recipient, {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text,
          buttons: [
            {
              type: "web_url",
              url: account.welcome_button_url,
              title: String(account.welcome_button_title).slice(0, 20),
            },
          ],
        },
      },
    });
  }

  return callSendAPI(igAccountId, accessToken, recipient, { text });
}

// Decides what the very next step should be
function nextPendingStatus(automation, justCleared) {
  const needsFollow = !!automation.require_follow;
  const needsCollect = !!automation.collect_field;

  if (justCleared === "none") {
    if (needsFollow) return "awaiting_first_click";
    if (needsCollect) return "awaiting_data";
    return null;
  }
  if (justCleared === "follow") {
    if (needsCollect) return "awaiting_data";
    return null;
  }
  if (justCleared === "data") {
    return null;
  }
  return null;
}

// Shared entry point for automation flow
async function startAutomationFlow({
  igAccountId,
  accessToken,
  automation,
  recipient,
  triggerUserId,
  triggerUsername,
}) {
  const firstStatus = nextPendingStatus(automation, "none");

  if (firstStatus === "awaiting_first_click") {
    console.log("🔄 FLOW: Require Follow ENABLED, Sending First Gate...");
    const sent = await sendFirstFollowGate(igAccountId, accessToken, recipient, automation.follow_prompt);
    if (sent) {
      await supabase.from("conversation_state").insert({
        automation_id: automation.id,
        ig_account_id: automation.ig_account_id,
        commenter_ig_id: triggerUserId,
        commenter_username: triggerUsername,
        status: "awaiting_first_click",
      });
      console.log("✅ DB STATE UPDATED: awaiting_first_click");
    }
    return;
  }

  if (firstStatus === "awaiting_data") {
    console.log("🔄 FLOW: Collect field ENABLED (no follow gate), asking for", automation.collect_field);
    const sent = await sendCollectPrompt(igAccountId, accessToken, recipient, automation.collect_prompt, automation.collect_field);
    if (sent) {
      await supabase.from("conversation_state").insert({
        automation_id: automation.id,
        ig_account_id: automation.ig_account_id,
        commenter_ig_id: triggerUserId,
        commenter_username: triggerUsername,
        status: "awaiting_data",
      });
      console.log("✅ DB STATE UPDATED: awaiting_data");
    }
    return;
  }

  console.log("🔄 FLOW: Direct send link (no gates)...");
  await sendFinalMessage(igAccountId, accessToken, automation, recipient, triggerUsername || "there");
}

// POST Method: Webhook Receiver
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

      // ------------- 1. COMMENTS PROCESSOR (posts/reels AND live videos) -------------
      for (const change of changes) {
        if (change.field !== "comments" && change.field !== "live_comments") continue;

        const isLive = change.field === "live_comments";
        const dbTriggerType = isLive ? "live_comment" : "comment";
        
        const commentVal = change.value || {};
        const commentText = (commentVal.text || "").trim();
        const commenterId = commentVal.from?.id;
        const commenterUsername = commentVal.from?.username;
        const commentId = commentVal.id;

        console.log(`💬 ${isLive ? "LIVE " : ""}COMMENT DETECTED: "${commentText}" from User IG_ID: ${commenterId}`);
        console.log(`🔍 SEARCHING DB FOR ACCOUNT ID: "${igAccountId}"`);

        const { data: account, error: accountErr } = await supabase
          .from("instagram_accounts")
          .select("id, access_token, ig_username, ig_user_id")
          .eq("ig_user_id", igAccountId)
          .maybeSingle();

        if (accountErr) console.error("❌ SUPABASE DB ERROR:", accountErr.message);

        if (!account) {
          console.log("🛑 STOP: ig_user_id database mein nahi mila!");
          continue;
        }
        
        console.log("✅ ACCOUNT FOUND IN DB:", account.ig_username);

        const { data: automations, error: autoErr } = await supabase
          .from("automations")
          .select("*")
          .eq("ig_account_id", account.id)
          .eq("status", "active")
          .eq("trigger_type", dbTriggerType);

        if (autoErr) console.error("❌ AUTOMATIONS DB ERROR:", autoErr.message);

        if (!automations || automations.length === 0) {
          console.log(`🛑 STOP: Koi active ${dbTriggerType} automation nahi mili is account ke liye!`);
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
           console.log("⚠️ WARNING: Commenter ka ID null hai. App me permissions check karein.");
           continue;
        }

        await startAutomationFlow({
          igAccountId,
          accessToken: account.access_token,
          automation: matched,
          recipient: { comment_id: commentId },
          triggerUserId: commenterId,
          triggerUsername: commenterUsername,
        });
      }

      // ------------- 2. DM / STORY REPLY / BUTTON CLICKS PROCESSOR -------------
      for (const msg of messaging) {
        // Echo filter to prevent infinite loops from our own bot messages
        const isEcho = msg.message?.is_echo;
        if (isEcho) {
          console.log("🔇 IGNORED ECHO MESSAGE");
          continue;
        }

        const senderId = msg.sender?.id;
        const rawText = (msg.message?.text || "").trim();
        const textPayload = msg.message?.quick_reply?.payload || msg.postback?.payload || rawText;
        const isStoryReply = !!msg.message?.reply_to?.story;

        if (!senderId) continue;
        console.log(`📩 INBOX EVENT: Sender=${senderId} | StoryReply=${isStoryReply} | Text/Payload=${textPayload}`);

        const { data: account, error: accountErr } = await supabase
          .from("instagram_accounts")
          .select("id, access_token, ig_username, welcome_enabled, welcome_message, welcome_button_title, welcome_button_url")
          .eq("ig_user_id", igAccountId)
          .maybeSingle();

        if (accountErr) console.error("❌ SUPABASE DM DB ERROR:", accountErr.message);
        if (!account) {
          console.log("🛑 STOP: Account for DM recipient not found in DB.");
          continue;
        }

        // Check if user is mid-flow (waiting on a gate)
        const { data: pending } = await supabase
          .from("conversation_state")
          .select("*, automations(*)")
          .eq("ig_account_id", account.id)
          .eq("commenter_ig_id", senderId)
          .in("status", ["awaiting_first_click", "awaiting_second_click", "awaiting_data"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // --- Case A: NEW Story Reply ---
        if (isStoryReply && !pending && rawText) {
          console.log("📖 STORY REPLY DETECTED, checking for matching automations...");

          const { data: storyAutomations, error: storyAutoErr } = await supabase
            .from("automations")
            .select("*")
            .eq("ig_account_id", account.id)
            .eq("status", "active")
            .eq("trigger_type", "story_reply");

          if (storyAutoErr) console.error("❌ STORY AUTOMATIONS DB ERROR:", storyAutoErr.message);

          if (storyAutomations && storyAutomations.length > 0) {
            const matched = storyAutomations.find((a) => {
              const kwList = Array.isArray(a.keywords) ? a.keywords : [];
              if (kwList.includes("*")) return true;
              return kwList.some((kw) => rawText.toLowerCase().includes(String(kw).toLowerCase().trim()));
            });

            if (matched) {
              console.log("✅ STORY AUTOMATION MATCHED:", matched.id);
              await startAutomationFlow({
                igAccountId,
                accessToken: account.access_token,
                automation: matched,
                recipient: { id: senderId },
                triggerUserId: senderId,
                triggerUsername: null,
              });
            } else {
              console.log("🛑 STOP: Story reply text kisi keyword se match nahi hua!");
            }
          } else {
            console.log("🛑 STOP: Koi active story_reply automation nahi mili!");
          }
          continue;
        }

        // --- Case B: Direct DM (Welcome Message Trigger) ---
        if (!isStoryReply && !pending && rawText) {
          if (!account.welcome_enabled) {
            console.log("⚠️ WELCOME MESSAGE IS DISABLED FOR THIS ACCOUNT IN DB.");
          } else {
            // Check if sender was already welcomed
            const { data: alreadyWelcomed, error: welcomeErr } = await supabase
              .from("welcomed_senders")
              .select("id")
              .eq("ig_account_id", account.id)
              .eq("sender_ig_id", senderId)
              .maybeSingle();

            if (welcomeErr) {
              console.error("⚠️ WELCOMED_SENDERS DB CHECK ERROR:", welcomeErr.message);
            }

            if (alreadyWelcomed) {
              console.log(`ℹ️ SENDER ${senderId} ALREADY RECEIVED WELCOME MESSAGE PREVIOUSLY. SKIPPING.`);
            } else {
              console.log("👋 NEW SENDER DETECTED! Triggering Welcome Message...");
              const sent = await sendWelcomeMessage(igAccountId, account.access_token, { id: senderId }, account);
              
              if (sent) {
                const { error: insertErr } = await supabase.from("welcomed_senders").insert({
                  ig_account_id: account.id,
                  sender_ig_id: senderId,
                });
                if (insertErr) {
                  console.error("⚠️ COULD NOT RECORD SENDER IN WELCOMED_SENDERS:", insertErr.message);
                } else {
                  console.log("✅ RECORDED SENDER IN WELCOMED_SENDERS DB TABLE");
                }
              }
              continue;
            }
          }
        }

        // --- Case C: Mid-flow Conversation / Pending Gates ---
        if (!pending || !pending.automations) {
           console.log("🛑 STOP: Is user ke liye koi active pending gate ya automation nahi hai.");
           continue;
        }

        const automation = pending.automations;
        const recipient = { id: senderId };

        // FIRST GATE CLICKED
        if (pending.status === "awaiting_first_click" && (textPayload === "FIRST_FOLLOW_CHECK" || textPayload.toLowerCase().includes("followed"))) {
          console.log("✅ FIRST GATE PASSED! Sending Second Gate...");
          await supabase.from("conversation_state").update({ status: "awaiting_second_click", updated_at: new Date().toISOString() }).eq("id", pending.id);
          await sendSecondProfileGate(igAccountId, account.access_token, recipient, account.ig_username || "instagram");
          continue;
        }

        // SECOND GATE CLICKED
        if (pending.status === "awaiting_second_click" && (textPayload === "SECOND_FOLLOW_CONFIRMED" || textPayload.toLowerCase().includes("yes"))) {
           console.log("✅ SECOND GATE PASSED!");
           const afterFollow = nextPendingStatus(automation, "follow");

           if (afterFollow === "awaiting_data") {
             console.log("🔄 Now asking for", automation.collect_field);
             await supabase.from("conversation_state").update({ status: "awaiting_data", updated_at: new Date().toISOString() }).eq("id", pending.id);
             await sendCollectPrompt(igAccountId, account.access_token, recipient, automation.collect_prompt, automation.collect_field);
           } else {
             console.log("✅ No more gates, sending Final Link...");
             await supabase.from("conversation_state").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", pending.id);
             await sendFinalMessage(igAccountId, account.access_token, automation, recipient, pending.commenter_username || "there");
           }
           continue;
        }

        // DATA COLLECTION REPLY
        if (pending.status === "awaiting_data" && rawText) {
          console.log("✅ DATA COLLECTED:", rawText, "-> sending Final Link...");
          await supabase
            .from("conversation_state")
            .update({ status: "completed", collected_value: rawText, updated_at: new Date().toISOString() })
            .eq("id", pending.id);

          await supabase.from("message_logs").insert({
            automation_id: automation.id,
            commenter_ig_id: senderId,
            commenter_username: pending.commenter_username,
            matched_keyword: "data_collected",
            dm_sent: true,
            collected_value: rawText,
          });

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
