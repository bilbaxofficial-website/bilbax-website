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

  // Fetch ALL Instagram accounts connected to this user (up to 5).
  // Ordered oldest-first so the switcher tabs stay in a stable order.
  const { data: igAccounts } = await supabase
    .from("instagram_accounts")
    .select("id, ig_username, connected_at")
    .eq("user_id", user.id)
    .order("connected_at", { ascending: true });

  return (
    <Suspense fallback={null}>
      <DashboardClient user={user} igAccounts={igAccounts || []} />
    </Suspense>
  );
}
