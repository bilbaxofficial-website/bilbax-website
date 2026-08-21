import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase-server";
import AutomationsListClient from "./AutomationsListClient";

export default async function AutomationsPage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const requestedAccountId = params?.account;

  // Figure out which Instagram account's automations to show. If one was
  // specified via ?account=<id> (from the dashboard's account switcher),
  // use that. Otherwise fall back to the user's first connected account,
  // so a direct link to /dashboard/automations without a query param
  // still works sensibly.
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

  // Also grab the account's username, so the list page can show which
  // account these automations belong to.
  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("id, ig_username")
    .eq("id", accountId)
    .eq("user_id", user.id) // security: make sure this account actually belongs to the logged-in user
    .maybeSingle();

  if (!account) {
    redirect("/dashboard");
  }

  const { data: automations } = await supabase
    .from("automations")
    .select(
      "id, trigger_type, keywords, dm_message, comment_reply, status, created_at, require_follow, collect_field, button_title, button_url, followups"
    )
    .eq("user_id", user.id)
    .eq("ig_account_id", account.id)
    .order("created_at", { ascending: false });

  return (
    <AutomationsListClient
      automations={automations || []}
      igAccountId={account.id}
      igUsername={account.ig_username}
    />
  );
}
