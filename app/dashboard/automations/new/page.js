import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase-server";
import NewAutomationClient from "./NewAutomationClient";

export default async function NewAutomationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("id, ig_username")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!igAccount) {
    redirect("/dashboard");
  }

  return <NewAutomationClient igAccountId={igAccount.id} igUsername={igAccount.ig_username} />;
}
