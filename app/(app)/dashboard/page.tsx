"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  captureLocation,
  GeoError,
  googleMapsLink,
  shortLocality,
} from "@/lib/geo";
import {
  formatDayHeading,
  formatTime,
  greeting,
  startOfDay,
  workingHours,
} from "@/lib/format";
import { outcomeMeta, type Attendance, type VisitWithRelations } from "@/lib/types";
import Modal from "@/components/Modal";
import LocationErrorModal from "@/components/LocationErrorModal";
import SyncStatus from "@/components/SyncStatus";

export default function Dashboard() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [session, setSession] = useState<Attendance | null>(null);
  const [visitCount, setVisitCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [recent, setRecent] = useState<VisitWithRelations[]>([]);

  const [busy, setBusy] = useState(false);
  const [geoError, setGeoError] = useState<GeoError | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [dayDone, setDayDone] = useState<null | {
    visits: number;
    leads: number;
    hours: string;
  }>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: profile }, { data: openSession }, { data: visits }, { count: leads }] =
      await Promise.all([
        supabase.from("users").select("name").eq("id", user.id).single(),
        supabase
          .from("attendance")
          .select("*")
          .eq("user_id", user.id)
          .is("punch_out_time", null)
          .order("punch_in_time", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("visits")
          .select(
            "*, site:sites(id,name,site_type), lead:leads(id,estimated_monthly_business,priority,status)"
          )
          .eq("user_id", user.id)
          .gte("visit_time", startOfDay().toISOString())
          .order("visit_time", { ascending: false }),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfDay().toISOString()),
      ]);

    setName(profile?.name || "");
    setSession((openSession as Attendance) ?? null);
    const vlist = ((visits as any[]) ?? []).map((v) => ({
      ...v,
      lead: Array.isArray(v.lead) ? v.lead[0] ?? null : v.lead,
    })) as VisitWithRelations[];
    setVisitCount(vlist.length);
    setRecent(vlist.slice(0, 3));
    setLeadCount(leads ?? 0);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePunchIn() {
    setBusy(true);
    setGeoError(null);
    try {
      const fix = await captureLocation();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("attendance").insert({
        user_id: user.id,
        punch_in_time: new Date().toISOString(),
        punch_in_latitude: fix.latitude,
        punch_in_longitude: fix.longitude,
        punch_in_accuracy: fix.accuracy,
        punch_in_address: fix.address,
      });
      if (error) throw error;
      await load();
    } catch (e) {
      if (e instanceof GeoError) setGeoError(e);
      else alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmPunchOut() {
    setBusy(true);
    setGeoError(null);
    try {
      const fix = await captureLocation();
      if (!session) return;
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("attendance")
        .update({
          punch_out_time: now,
          punch_out_latitude: fix.latitude,
          punch_out_longitude: fix.longitude,
          punch_out_accuracy: fix.accuracy,
          punch_out_address: fix.address,
        })
        .eq("id", session.id);
      if (error) throw error;
      const hours = workingHours(session.punch_in_time, now);
      setConfirmOut(false);
      setDayDone({ visits: visitCount, leads: leadCount, hours });
      await load();
    } catch (e) {
      if (e instanceof GeoError) {
        setConfirmOut(false);
        setGeoError(e);
      } else alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const punchedIn = !!session;
  const locality =
    shortLocality(session?.punch_in_address) ??
    (session ? "Location captured" : null);

  return (
    <main className="px-4 pt-6">
      {/* Header */}
      <header className="mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">
          Lab IQ Sales
        </p>
        <h1 className="mt-1 text-2xl font-black">
          {greeting()}
          {name ? `, ${name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-slate-500">{formatDayHeading()}</p>
      </header>

      <div className="mb-4">
        <SyncStatus />
      </div>

      {/* Attendance card */}
      <section className="card mb-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
          Attendance
        </p>
        {loading ? (
          <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
        ) : punchedIn ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="chip bg-green-100 text-green-700">
                ● Punched In
              </span>
              <span className="text-lg font-bold">
                {formatTime(session!.punch_in_time)}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1 text-slate-600">
              📍 {locality}
            </p>
            {session!.punch_in_latitude != null && (
              <a
                className="mt-1 inline-block text-sm font-semibold text-brand"
                href={googleMapsLink(
                  session!.punch_in_latitude!,
                  session!.punch_in_longitude!
                )}
                target="_blank"
                rel="noreferrer"
              >
                View location →
              </a>
            )}
            <button
              className="btn btn-danger btn-lg mt-4 w-full"
              onClick={() => setConfirmOut(true)}
              disabled={busy}
            >
              🔴 Punch Out
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-slate-600">Not Punched In</p>
            <button
              className="btn btn-success btn-lg w-full"
              onClick={handlePunchIn}
              disabled={busy}
            >
              {busy ? "Capturing location…" : "🟢 Punch In"}
            </button>
          </div>
        )}
      </section>

      {/* Today counts */}
      <section className="card mb-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
          Today
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <div className="text-3xl font-black">{visitCount}</div>
            <div className="text-sm text-slate-500">Visits</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <div className="text-3xl font-black">{leadCount}</div>
            <div className="text-sm text-slate-500">Leads</div>
          </div>
        </div>
      </section>

      {/* New visit CTA */}
      <Link href="/new-visit" className="btn btn-primary btn-lg mb-4 w-full">
        + New Visit
      </Link>

      {/* Recent visits */}
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
          Recent Visits
        </p>
        {recent.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-center text-slate-400 shadow-sm">
            No visits yet
          </p>
        ) : (
          <ul className="space-y-3">
            {recent.map((v) => {
              const m = outcomeMeta(v.outcome);
              return (
                <li key={v.id}>
                  <Link href={`/visits/${v.id}`} className="card block">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        {v.site?.name ?? "Unknown site"}
                      </span>
                      <span className="text-sm text-slate-400">
                        {formatTime(v.visit_time)}
                      </span>
                    </div>
                    {m && (
                      <span className="mt-1 inline-block text-sm">
                        {m.emoji} {m.value}
                      </span>
                    )}
                    {v.lead && (
                      <span className="ml-2 text-sm font-semibold text-brand">
                        Lead ✓
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Punch-out confirmation */}
      <Modal open={confirmOut} onClose={() => setConfirmOut(false)}>
        <h3 className="text-center text-lg font-bold">
          Are you sure you want to punch out?
        </h3>
        <div className="my-4 space-y-2 rounded-xl bg-slate-50 p-4 text-center">
          <div>
            <span className="text-slate-500">Punch In: </span>
            <span className="font-bold">
              {session && formatTime(session.punch_in_time)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Current Time: </span>
            <span className="font-bold">{formatTime(new Date())}</span>
          </div>
          <div>
            <span className="text-slate-500">Working Hours: </span>
            <span className="font-bold">
              {session && workingHours(session.punch_in_time, new Date())}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            className="btn btn-ghost flex-1"
            onClick={() => setConfirmOut(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger flex-1"
            onClick={confirmPunchOut}
            disabled={busy}
          >
            {busy ? "…" : "Punch Out"}
          </button>
        </div>
      </Modal>

      {/* Day completed */}
      <Modal open={!!dayDone} onClose={() => setDayDone(null)}>
        <div className="text-center">
          <div className="mb-2 text-4xl">✓</div>
          <h3 className="text-xl font-black">Day Completed</h3>
          <div className="my-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-2xl font-black">{dayDone?.visits}</div>
              <div className="text-xs text-slate-500">Visits</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-2xl font-black">{dayDone?.leads}</div>
              <div className="text-xs text-slate-500">Leads</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-lg font-black">{dayDone?.hours}</div>
              <div className="text-xs text-slate-500">Hours</div>
            </div>
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={() => setDayDone(null)}
          >
            Done
          </button>
        </div>
      </Modal>

      <LocationErrorModal
        error={geoError}
        busy={busy}
        onCancel={() => setGeoError(null)}
        onRetry={() => {
          setGeoError(null);
          if (punchedIn) confirmPunchOut();
          else handlePunchIn();
        }}
      />
    </main>
  );
}
