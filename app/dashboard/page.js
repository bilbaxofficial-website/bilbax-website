import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase-server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in - send them to the login page.
  if (!user) {
    redirect("/login");
  }

  // Check if they already connected an Instagram account.
  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("ig_username, connected_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return <DashboardClient user={user} igAccount={igAccount} />;
}
