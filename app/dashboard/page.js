import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "../../lib/supabase-server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: igAccounts } = await supabase
    .from("instagram_accounts")
    .select("id, ig_username, connected_at, welcome_enabled, welcome_message, welcome_button_title, welcome_button_url")
    .eq("user_id", user.id)
    .order("connected_at", { ascending: true });

  return (
    <Suspense fallback={null}>
      <DashboardClient user={user} igAccounts={igAccounts || []} />
    </Suspense>
  );
}
