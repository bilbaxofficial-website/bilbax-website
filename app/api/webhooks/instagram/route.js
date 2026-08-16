// This is the engine. Meta calls this URL every time someone comments on
// a connected Instagram account. We check if any automation's keyword
// matches, and if so, send the DM.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js"; // <-- Change 1: Direct Supabase client import kiya

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
  console.log("WEBHOOK BODY:", JSON.stringify(body));
  
  // <-- Change 2: Yahan hum explicitly Service Role Key (Admin Key) pass kar rahe hain taaki RLS bypass ho jaye
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const entries = body.entry || [];
    console.log("Entries count:", entries.length);

    for (const entry of entries) {
      const changes = entry.changes || [];
      console.log("Changes count:", changes.length);

      for (const change of changes) {
        console.log("Change field:", change.field);
        if (change.field !== "comments") continue;

        const commentText = change.value?.text || "";
        const commenterId = change.value?.from?.id;
        const commenterUsername = change.value?.from?.username;
        
        // <-- Change 3: ID ko strictly String banaya hai taaki large number corrupt na ho
        const igAccountId = String(entry.id).trim(); 
        const commentId = change.value?.id;

        console.log("Comment text:", commentText, "| igAccountId:", igAccountId, "| commentId:", commentId);

        // Find the connected account in our database.
        const { data: account, error: accountErr } = await supabase
          .from("instagram_accounts")
          .select("id, access_token")
          .eq("ig_user_id", igAccountId)
          .maybeSingle();

        console.log("Account lookup result:", account, "| error:", accountErr);

        if (!account) {
          console.log("STOPPED: no matching instagram_accounts row for ig_user_id =", igAccountId);
          continue;
        }

        // Find all active automations for this account.
        const { data: automations, error: autoErr } = await supabase
          .from("automations")
          .select("*")
          .eq("ig_account_id", account.id)
          .eq("status", "active");

        console.log("Automations found:", automations, "| error:", autoErr);

        if (!automations || automations.length === 0) {
          console.log("STOPPED: no active automations for account.id =", account.id);
          continue;
        }

        // Find the first automation whose keywords match this comment.
        const matched = automations.find((a) => {
          if (a.keywords.includes("*")) return true; // "any comment" automation
          const lowerComment = commentText.toLowerCase();
          return a.keywords.some((kw) => lowerComment.includes(kw.toLowerCase()));
        });

        console.log("Matched automation:", matched);

        if (!matched) {
          console.log("STOPPED: no keyword matched. commentText =", commentText, "| automation keywords =", automations.map(a => a.keywords));
          continue;
        }

        // Personalize the message.
        const firstName = commenterUsername || "there";
        const personalizedMessage = matched.dm_message.replace(
          /\{first_name\}/g,
          firstName
        );

        // Send the DM via Instagram's Send API.
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
          console.log("Instagram Send API response:", sendData);
          dmSent = !sendData.error;
          if (sendData.error) errorMsg = JSON.stringify(sendData.error);
        } catch (err) {
          errorMsg = String(err);
          console.log("Send API threw error:", errorMsg);
        }

        // Optionally reply publicly on the comment too.
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
            // Non-critical - don't fail the whole request if just the public reply fails.
          }
        }

        // Log what happened.
        await supabase.from("message_logs").insert({
          automation_id: matched.id,
          commenter_ig_id: commenterId,
          commenter_username: commenterUsername,
          matched_keyword: matched.keywords.includes("*") ? "*" : matched.keywords[0],
          dm_sent: dmSent,
          error: errorMsg,
        });

        console.log("DONE. dmSent =", dmSent, "| errorMsg =", errorMsg);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ status: "error" }, { status: 200 }); // still 200 so Meta doesn't retry endlessly
  }
}
