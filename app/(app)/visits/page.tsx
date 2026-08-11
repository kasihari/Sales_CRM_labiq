"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDateShort, formatRupees, formatTime } from "@/lib/format";
import { outcomeMeta, type VisitWithRelations } from "@/lib/types";

export default function VisitsPage() {
  const supabase = createClient();
  const [visits, setVisits] = useState<VisitWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("visits")
        .select(
          "*, site:sites(id,name,site_type), lead:leads(id,estimated_monthly_business,priority,status)"
        )
        .eq("user_id", user.id)
        .order("visit_time", { ascending: false })
        .limit(100);
      const list = ((data as any[]) ?? []).map((v) => ({
        ...v,
        lead: Array.isArray(v.lead) ? v.lead[0] ?? null : v.lead,
      })) as VisitWithRelations[];
      setVisits(list);
      setLoading(false);
    })();
  }, [supabase]);

  return (
    <main className="px-4 pt-6">
      <h1 className="mb-4 text-2xl font-black">My Visits</h1>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : visits.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-slate-400 shadow-sm">
          No visits recorded yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {visits.map((v) => {
            const m = outcomeMeta(v.outcome);
            return (
              <li key={v.id}>
                <Link href={`/visits/${v.id}`} className="card block">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">
                      {v.site?.name ?? "Unknown site"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">
                    {formatDateShort(v.visit_time)} · {formatTime(v.visit_time)}
                  </p>
                  {(v.person_met || v.designation) && (
                    <p className="mt-1 text-sm text-slate-600">
                      {v.person_met}
                      {v.person_met && v.designation ? " · " : ""}
                      {v.designation}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {m && (
                      <span
                        className="chip text-white"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.emoji} {m.value}
                      </span>
                    )}
                    {v.lead ? (
                      <span className="chip bg-brand/10 text-brand">
                        Lead ✓{" "}
                        {v.lead.estimated_monthly_business
                          ? `· ${formatRupees(
                              v.lead.estimated_monthly_business
                            )}/mo`
                          : ""}
                      </span>
                    ) : (
                      <span className="chip bg-slate-100 text-slate-500">
                        No Lead
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
