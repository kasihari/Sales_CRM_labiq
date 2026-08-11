"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  formatRupeesCompact,
  formatTime,
  startOfDay,
} from "@/lib/format";
import { outcomeMeta, type Attendance, type VisitWithRelations } from "@/lib/types";
import ManagerMap from "@/components/ManagerMap";

export default function SalespersonView() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [visits, setVisits] = useState<VisitWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const from = startOfDay().toISOString();
      const to = new Date(startOfDay());
      to.setDate(to.getDate() + 1);

      const [{ data: profile }, { data: att }, { data: v }] = await Promise.all([
        supabase.from("users").select("name").eq("id", id).single(),
        supabase
          .from("attendance")
          .select("*")
          .eq("user_id", id)
          .gte("punch_in_time", from)
          .order("punch_in_time", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("visits")
          .select(
            "*, site:sites(id,name,site_type), user:users(id,name), lead:leads(id,estimated_monthly_business,priority,status)"
          )
          .eq("user_id", id)
          .gte("visit_time", from)
          .lt("visit_time", to.toISOString())
          .order("visit_time", { ascending: false }),
      ]);

      setName(profile?.name ?? "");
      setAttendance((att as Attendance) ?? null);
      const list = ((v as any[]) ?? []).map((row) => ({
        ...row,
        user: Array.isArray(row.user) ? row.user[0] ?? null : row.user,
        lead: Array.isArray(row.lead) ? row.lead[0] ?? null : row.lead,
      })) as VisitWithRelations[];
      setVisits(list);
      setLoading(false);
    })();
  }, [id, supabase]);

  const leadCount = visits.filter((v) => v.lead).length;
  const potential = visits.reduce(
    (s, v) => s + (v.lead?.estimated_monthly_business ?? 0),
    0
  );

  return (
    <main className="px-4 py-4">
      <h1 className="text-2xl font-black">{loading ? "…" : name}</h1>
      <p className="text-slate-500">Today&apos;s activity</p>

      <section className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Punch In"
          value={
            attendance?.punch_in_time
              ? formatTime(attendance.punch_in_time)
              : "—"
          }
        />
        <Stat
          label="Punch Out"
          value={
            attendance?.punch_out_time
              ? formatTime(attendance.punch_out_time)
              : "Not yet"
          }
        />
        <Stat label="Visits" value={String(visits.length)} />
        <Stat label="Leads" value={String(leadCount)} />
      </section>
      <div className="mt-3">
        <Stat label="Potential Business" value={formatRupeesCompact(potential)} />
      </div>

      <section className="mt-4 h-[320px] overflow-hidden rounded-2xl shadow-sm sm:h-[400px]">
        <ManagerMap visits={visits} />
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">
          Today&apos;s Visits — {visits.length}
        </h2>
        {loading ? (
          <div className="h-16 animate-pulse rounded-xl bg-white" />
        ) : visits.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-center text-slate-400 shadow-sm">
            No visits today.
          </p>
        ) : (
          <ul className="space-y-2">
            {visits.map((v) => {
              const m = outcomeMeta(v.outcome);
              return (
                <li key={v.id}>
                  <Link
                    href={`/visits/${v.id}`}
                    className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {v.site?.name ?? "Unknown site"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatTime(v.visit_time)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {m && <span title={m.value}>{m.emoji}</span>}
                      {v.lead && (
                        <span className="chip bg-brand/10 text-brand">
                          Lead ✓
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <div className="text-xl font-black">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
