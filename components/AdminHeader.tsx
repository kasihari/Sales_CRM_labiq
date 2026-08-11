"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminHeader({ name }: { name: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-brand text-white shadow">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-black">
            IQ
          </span>
          <span className="font-black tracking-tight">Lab IQ · Manager</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {pathname !== "/admin" && (
            <Link href="/admin" className="font-semibold text-white/90">
              ← Dashboard
            </Link>
          )}
          <span className="hidden sm:inline text-white/80">{name}</span>
          <button onClick={logout} className="font-semibold underline">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
