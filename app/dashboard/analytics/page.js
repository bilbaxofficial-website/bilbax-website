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
  const requestedAccountId = params?.account; // may be a real account id, or "overview"

  // Every account this user has connected - needed for the switcher tabs
  // and for building the "Overview" (all-accounts) totals.
  const { data: allAccounts } = await supabase
    .from("instagram_accounts")
    .select("id, ig_username, connected_at")
    .eq("user_id", user.id)
    .order("connected_at", { ascending: true });

  const accounts = allAccounts || [];
  if (accounts.length === 0) {
    redirect("/dashboard");
  }

  const isOverview = requestedAccountId === "overview" || (!requestedAccountId && accounts.length > 1 ? false : false);
  const wantsOverview = requestedAccountId === "overview";

  // Resolve which single account to show (used unless "overview" was requested).
  let selectedAccountId = requestedAccountId && requestedAccountId !== "overview" ? requestedAccountId : accounts[0].id;
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  // Fetch automations + logs for ALL of this user's accounts in one go -
  // cheap enough at this scale, and lets us build both per-account view
  // and the combined Overview from the same data without two round trips.
  const { data: allAutomations } = await supabase
    .from("automations")
    .select("id, ig_account_id, trigger_type, keywords, dm_message, status, post_id")
    .eq("user_id", user.id);

  const automations = allAutomations || [];
  const automationIds = automations.map((a) => a.id);

  let logs = [];
  if (automationIds.length > 0) {
    const { data: logRows } = await supabase
      .from("message_logs")
      .select("id, automation_id, commenter_username, commenter_ig_id, matched_keyword, dm_sent, collected_value, created_at")
      .in("automation_id", automationIds)
      .order("created_at", { ascending: false })
      .limit(1000);
    logs = logRows || [];
  }

  return (
    <AnalyticsClient
      accounts={accounts}
      selectedAccountId={wantsOverview ? "overview" : selectedAccount.id}
      automations={automations}
      logs={logs}
      accessTokenByAccount={Object.fromEntries(
        (await supabase
          .from("instagram_accounts")
          .select("id, access_token")
          .eq("user_id", user.id)
        ).data?.map((a) => [a.id, a.access_token]) || []
      )}
    />
  );
}
