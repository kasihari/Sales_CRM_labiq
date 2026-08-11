import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Entry point: route to login, salesperson dashboard, or manager dashboard.
export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "manager") redirect("/admin");
  redirect("/dashboard");
}
