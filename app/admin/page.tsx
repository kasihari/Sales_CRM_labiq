"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  formatRupeesCompact,
  formatTime,
  startOfDay,
} from "@/lib/format";
import { OUTCOMES, outcomeMeta, type VisitWithRelations } from "@/lib/types";
import ManagerMap from "@/components/ManagerMap";

type DateKey = "today" | "yesterday" | "week" | "custom";

function rangeFor(key: DateKey, custom: string): { from: Date; to: Date; label: string } {
  const now = new Date();
  if (key === "yesterday") {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    return { from: startOfDay(y), to: startOfDay(now), label: "Yesterday" };
  }
  if (key === "week") {
    const w = new Date(now);
    w.setDate(now.getDate() - 6);
    const to = new Date(startOfDay(now));
    to.setDate(to.getDate() + 1);
    return { from: startOfDay(w), to, label: "This Week" };
  }
  if (key === "custom" && custom) {
    const d = new Date(custom + "T00:00:00");
    const to = new Date(d);
    to.setDate(d.getDate() + 1);
    return { from: d, to, label: custom };
  }
  const to = new Date(startOfDay(now));
  to.setDate(to.getDate() + 1);
  return { from: startOfDay(now), to, label: "Today" };
}

interface Salesperson {
  id: string;
  name: string;
}

export default function AdminDashboard() {
  const supabase = createClient();

  const [dateKey, setDateKey] = useState<DateKey>("today");
  const [custom, setCustom] = useState("");
  const [person, setPerson] = useState("all");
  const [leadFilter, setLeadFilter] = useState<"all" | "lead" | "nolead">("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  const [visits, setVisits] = useState<VisitWithRelations[]>([]);
  const [people, setPeople] = useState<Salesperson[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => rangeFor(dateKey, custom), [dateKey, custom]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: users }, { data: att }, { data: v }] = await Promise.all([
      supabase
        .from("users")
        .select("id,name")
        .eq("role", "salesperson")
        .order("name"),
      supabase
        .from("attendance")
        .select("user_id")
        .gte("punch_in_time", range.from.toISOString())
        .lt("punch_in_time", range.to.toISOString()),
      supabase
        .from("visits")
        .select(
          "*, site:sites(id,name,site_type), user:users(id,name), lead:leads(id,estimated_monthly_business,priority,status)"
        )
        .gte("visit_time", range.from.toISOString())
        .lt("visit_time", range.to.toISOString())
        .order("visit_time", { ascending: false }),
    ]);

    setPeople((users as Salesperson[]) ?? []);
    setActiveCount(
      new Set(((att as { user_id: string }[]) ?? []).map((a) => a.user_id)).size
    );
    const list = ((v as any[]) ?? []).map((row) => ({
      ...row,
      user: Array.isArray(row.user) ? row.user[0] ?? null : row.user,
      lead: Array.isArray(row.lead) ? row.lead[0] ?? null : row.lead,
    })) as VisitWithRelations[];
    setVisits(list);
    setLoading(false);
  }, [supabase, range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      visits.filter((v) => {
        if (person !== "all" && v.user?.id !== person) return false;
        if (leadFilter === "lead" && !v.lead) return false;
        if (leadFilter === "nolead" && v.lead) return false;
        if (outcomeFilter !== "all" && v.outcome !== outcomeFilter) return false;
        return true;
      }),
    [visits, person, leadFilter, outcomeFilter]
  );

  const newLeads = visits.filter((v) => v.lead).length;
  const potential = visits.reduce(
    (sum, v) => sum + (v.lead?.estimated_monthly_business ?? 0),
    0
  );

  return (
    <main className="px-4 py-4">
      {/* Summary */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Salespeople Active" value={String(activeCount)} />
        <Stat label="Visits" value={String(visits.length)} />
        <Stat label="New Leads" value={String(newLeads)} />
        <Stat label="Potential Business" value={formatRupeesCompact(potential)} />
      </section>

      {/* Filters */}
      <section className="mt-4 space-y-3 rounded-2xl bg-white p-3 shadow-sm">
        <Filter label="Date">
          {(["today", "yesterday", "week", "custom"] as DateKey[]).map((k) => (
            <Pill
              key={k}
              active={dateKey === k}
              onClick={() => setDateKey(k)}
            >
              {k === "week" ? "This Week" : k[0].toUpperCase() + k.slice(1)}
            </Pill>
          ))}
          {dateKey === "custom" && (
            <input
              type="date"
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          )}
        </Filter>

        <Filter label="Salesperson">
          <select
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
          >
            <option value="all">All</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Filter>

        <Filter label="Lead">
          {(["all", "lead", "nolead"] as const).map((k) => (
            <Pill
              key={k}
              active={leadFilter === k}
              onClick={() => setLeadFilter(k)}
            >
              {k === "all" ? "All" : k === "lead" ? "Lead" : "No Lead"}
            </Pill>
          ))}
        </Filter>

        <Filter label="Outcome">
          <Pill
            active={outcomeFilter === "all"}
            onClick={() => setOutcomeFilter("all")}
          >
            All
          </Pill>
          {OUTCOMES.map((o) => (
            <Pill
              key={o.value}
              active={outcomeFilter === o.value}
              onClick={() => setOutcomeFilter(o.value)}
            >
              {o.emoji} {o.value}
            </Pill>
          ))}
        </Filter>
      </section>

      {/* Map */}
      <section className="mt-4 h-[360px] overflow-hidden rounded-2xl shadow-sm sm:h-[440px]">
        <ManagerMap visits={filtered} />
      </section>

      {/* Visit list */}
      <section className="mt-4">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">
          {range.label} Visits — {filtered.length}
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-white" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-center text-slate-400 shadow-sm">
            No visits for this selection.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((v) => {
              const m = outcomeMeta(v.outcome);
              return (
                <li key={v.id}>
                  <Link
                    href={`/visits/${v.id}`}
                    className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {v.user?.name ?? "—"}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {v.site?.name ?? "Unknown site"} ·{" "}
                        {formatTime(v.visit_time)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {m && <span title={m.value}>{m.emoji}</span>}
                      {v.lead ? (
                        <span className="chip bg-brand/10 text-brand">
                          Lead ✓
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
      </section>

      {/* Salespeople quick links */}
      {people.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">
            Salespeople
          </h2>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => (
              <Link
                key={p.id}
                href={`/admin/salesperson/${p.id}`}
                className="chip bg-white text-slate-700 shadow-sm"
              >
                {p.name} →
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Filter({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <span className="w-24 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`chip shrink-0 whitespace-nowrap border ${
        active
          ? "bg-brand text-white border-brand"
          : "bg-white text-slate-600 border-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
