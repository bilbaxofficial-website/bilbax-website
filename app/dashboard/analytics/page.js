import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase-server";
import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const requestedAccountId = params?.account;

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

  // All automations for this account (for the per-automation breakdown
  // and to know which automation_ids belong to this account).
  const { data: automations } = await supabase
    .from("automations")
    .select("id, trigger_type, keywords, dm_message, status")
    .eq("ig_account_id", account.id);

  const automationIds = (automations || []).map((a) => a.id);

  // All message_logs for this account's automations. Fetching a generous
  // window (last 500 rows) is enough for an early-stage product without
  // needing pagination yet.
  let logs = [];
  if (automationIds.length > 0) {
    const { data: logRows } = await supabase
      .from("message_logs")
      .select("id, automation_id, commenter_username, commenter_ig_id, matched_keyword, dm_sent, collected_value, created_at")
      .in("automation_id", automationIds)
      .order("created_at", { ascending: false })
      .limit(500);
    logs = logRows || [];
  }

  return (
    <AnalyticsClient
      igAccountId={account.id}
      igUsername={account.ig_username}
      automations={automations || []}
      logs={logs}
    />
  );
}
