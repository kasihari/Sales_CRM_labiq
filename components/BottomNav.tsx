"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const items = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/visits", label: "Visits", icon: "📋" },
  { href: "/leads", label: "Leads", icon: "🎯" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                active ? "text-brand" : "text-slate-400"
              }`}
            >
              <span className="text-xl">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium text-slate-400"
        >
          <span className="text-xl">↩︎</span>
          Logout
        </button>
      </div>
    </nav>
  );
}
