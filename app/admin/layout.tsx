import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminHeader from "@/components/AdminHeader";

// Manager-only area. Non-managers are bounced to the salesperson dashboard.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "manager") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader name={profile?.name ?? "Manager"} />
      <div className="mx-auto max-w-5xl">{children}</div>
    </div>
  );
}
