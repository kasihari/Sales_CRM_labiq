"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateShort, formatRupees } from "@/lib/format";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/types";

interface LeadRow extends Lead {
  site: { name: string; site_type: string } | null;
}

const priorityStyle: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
};

const statusStyle: Record<string, string> = {
  New: "bg-blue-100 text-blue-700",
  Interested: "bg-sky-100 text-sky-700",
  "Proposal Sent": "bg-violet-100 text-violet-700",
  Negotiation: "bg-amber-100 text-amber-700",
  Won: "bg-green-100 text-green-700",
  Lost: "bg-slate-200 text-slate-600",
};

export default function LeadsPage() {
  const supabase = createClient();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("leads")
        .select("*, site:sites(name,site_type)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setLeads((data as LeadRow[]) ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  async function updateStatus(id: string, status: LeadStatus) {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
    await supabase
      .from("leads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  return (
    <main className="px-4 pt-6">
      <h1 className="mb-4 text-2xl font-black">My Leads</h1>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-slate-400 shadow-sm">
          No leads generated yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => (
            <li key={l.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold">
                    {l.site?.name ?? "Unknown site"}
                  </p>
                  {l.lead_type && (
                    <p className="text-sm text-slate-500">{l.lead_type}</p>
                  )}
                </div>
                {l.priority && (
                  <span className={`chip ${priorityStyle[l.priority]}`}>
                    {l.priority} Priority
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {l.estimated_monthly_business != null && (
                  <Mini
                    label="Potential"
                    value={`${formatRupees(
                      l.estimated_monthly_business
                    )}/mo`}
                  />
                )}
                {l.expected_conversion && (
                  <Mini label="Expected" value={l.expected_conversion} />
                )}
                {l.next_followup_date && (
                  <Mini
                    label="Follow-up"
                    value={formatDateShort(l.next_followup_date)}
                  />
                )}
                {l.next_action && <Mini label="Next" value={l.next_action} />}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className={`chip ${statusStyle[l.status]}`}>
                  {l.status}
                </span>
                <label className="flex items-center gap-1 text-sm text-slate-500">
                  Update:
                  <select
                    className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-semibold"
                    value={l.status}
                    onChange={(e) =>
                      updateStatus(l.id, e.target.value as LeadStatus)
                    }
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
