import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase-server";
import NewAutomationClient from "./NewAutomationClient";

export default async function NewAutomationPage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const requestedAccountId = params?.account;

  // Build the query, filtering to a specific account if one was requested
  // in the URL (e.g. ?account=<id> from the dashboard's account switcher).
  let query = supabase
    .from("instagram_accounts")
    .select("id, ig_username")
    .eq("user_id", user.id);

  if (requestedAccountId) {
    query = query.eq("id", requestedAccountId);
  }

  const { data: igAccount } = await query
    .order("connected_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!igAccount) {
    redirect("/dashboard");
  }

  return <NewAutomationClient igAccountId={igAccount.id} igUsername={igAccount.ig_username} />;
}
