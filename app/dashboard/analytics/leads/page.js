import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase-server";
import LeadsClient from "./LeadsClient";

export default async function CapturedLeadsPage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const requestedAccountId = params?.account;
  const selectedRange = params?.range || "all";
  const rangeStart = params?.start || null;
  const rangeEnd = params?.end || null;

  let accountId = requestedAccountId;
  if (!accountId) {
    const { data: firstAccount } = await supabase
      .from("instagram_accounts")
      .select("id")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    accountId = firstAccount?.id;
  }

  if (!accountId) {
    redirect("/dashboard");
  }

  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("id, ig_username")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) {
    redirect("/dashboard");
  }

  const { data: automations } = await supabase
    .from("automations")
    .select("id, trigger_type, collect_field, status, keywords")
    .eq("ig_account_id", account.id);

  const automationMap = new Map((automations || []).map((a) => [a.id, a]));
  const automationIds = Array.from(automationMap.keys());

  let leads = [];
  if (automationIds.length > 0) {
    const { data: logRows, error } = await supabase
      .from("message_logs")
      .select(
        "id, automation_id, commenter_username, commenter_ig_id, collected_value, sent_at"
      )
      .in("automation_id", automationIds)
      .not("collected_value", "is", null)
      .order("sent_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Captured leads query error:", error);
    }

    const startMs = rangeStart ? new Date(rangeStart).getTime() : null;
    const endMs = rangeEnd ? new Date(rangeEnd).getTime() : null;

    leads = (logRows || [])
      .filter((lead) => {
        if (!startMs && !endMs) return true;
        const sentMs = new Date(lead.sent_at).getTime();
        return (!startMs || sentMs >= startMs) && (!endMs || sentMs <= endMs);
      })
      .map((lead) => ({
        ...lead,
        automation: automationMap.get(lead.automation_id) || null,
      }));
  }

  return (
    <LeadsClient
      igAccountId={account.id}
      igUsername={account.ig_username}
      leads={leads}
      selectedRange={selectedRange}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
    />
  );
}
