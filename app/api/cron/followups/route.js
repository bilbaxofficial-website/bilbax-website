// This runs on a schedule (configured in vercel.json). Every time it
// fires, it looks for people who are stuck mid-automation (waiting on a
// follow-gate tap or a data reply) and haven't replied in a while, then
// sends them the next follow-up message from that automation's list.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function callSendAPI(igAccountId, accessToken, recipientId, text) {
  try {
    const res = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        access_token: accessToken,
      }),
    });
    const data = await res.json();
    if (data.error) {
      console.error("❌ FOLLOWUP SEND ERROR:", data.error.message);
      return { sent: false, blocked: data.error.code === 551 || data.error.code === 10 };
    }
    return { sent: true, blocked: false };
  } catch (err) {
    console.error("❌ FOLLOWUP FETCH ERROR:", err);
    return { sent: false, blocked: false };
  }
}

export async function GET(request) {
  // Protect the cron endpoint - only Vercel's own cron scheduler (or
  // someone with the secret) should be able to trigger this.
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("⏰ FOLLOWUP CRON STARTED:", new Date().toISOString());

  try {
    // Pull every conversation that's still "stuck" (not completed).
    const { data: pendingConvos, error } = await supabase
      .from("conversation_state")
      .select("*, automations(*), instagram_accounts(id, access_token, ig_username)")
      .in("status", ["awaiting_first_click", "awaiting_second_click", "awaiting_data"]);

    if (error) {
      console.error("❌ FOLLOWUP QUERY ERROR:", error.message);
      return NextResponse.json({ status: "error" }, { status: 200 });
    }

    if (!pendingConvos || pendingConvos.length === 0) {
      console.log("✅ No pending conversations. Nothing to do.");
      return NextResponse.json({ status: "ok", processed: 0 });
    }

    console.log(`🔍 Found ${pendingConvos.length} pending conversation(s) to check.`);

    let sentCount = 0;

    for (const convo of pendingConvos) {
      const automation = convo.automations;
      const account = convo.instagram_accounts;
      if (!automation || !account) continue;

      const followupList = Array.isArray(automation.followups) ? automation.followups : [];
      if (followupList.length === 0) continue; // this automation has no follow-ups configured

      const alreadySent = convo.followups_sent || 0;
      if (alreadySent >= followupList.length) continue; // all configured follow-ups already sent

      const nextFollowup = followupList[alreadySent];
      if (!nextFollowup || !nextFollowup.after_minutes || !nextFollowup.message) continue;

      const minutesSinceUpdate = (Date.now() - new Date(convo.updated_at).getTime()) / 60000;

      if (minutesSinceUpdate < nextFollowup.after_minutes) continue; // not time yet

      console.log(
        `📤 Sending follow-up #${alreadySent + 1} to ${convo.commenter_username || convo.commenter_ig_id} (${Math.round(minutesSinceUpdate)}min since last update)`
      );

      const result = await callSendAPI(
        account.ig_user_id || account.id,
        account.access_token,
        convo.commenter_ig_id,
        nextFollowup.message.replace(/\{first_name\}/g, convo.commenter_username || "there")
      );

      if (result.blocked) {
        // They've blocked the account or the thread can't receive
        // messages - stop trying, mark as completed so we don't retry forever.
        console.log("🚫 Recipient appears to have blocked us. Stopping follow-ups for this conversation.");
        await supabase
          .from("conversation_state")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", convo.id);
        continue;
      }

      if (result.sent) {
        sentCount++;
        await supabase
          .from("conversation_state")
          .update({ followups_sent: alreadySent + 1, updated_at: new Date().toISOString() })
          .eq("id", convo.id);

        await supabase.from("message_logs").insert({
          automation_id: automation.id,
          commenter_ig_id: convo.commenter_ig_id,
          commenter_username: convo.commenter_username,
          matched_keyword: `followup_${alreadySent + 1}`,
          dm_sent: true,
        });
      }
    }

    console.log(`✅ FOLLOWUP CRON DONE. Sent ${sentCount} follow-up(s).`);
    return NextResponse.json({ status: "ok", processed: pendingConvos.length, sent: sentCount });
  } catch (err) {
    console.error("🔥 FOLLOWUP CRON FATAL ERROR:", err);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
