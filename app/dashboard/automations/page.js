import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase-server";
import AutomationsListClient from "./AutomationsListClient";

export default async function AutomationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: automations } = await supabase
    .from("automations")
    .select("id, keywords, dm_message, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <AutomationsListClient automations={automations || []} />;
}
