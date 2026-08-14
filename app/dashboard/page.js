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

  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("ig_username, connected_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <Suspense fallback={null}>
      <DashboardClient user={user} igAccount={igAccount} />
    </Suspense>
  );
}
