"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  captureLocation,
  GeoError,
  googleMapsLink,
  shortLocality,
  type GeoFix,
} from "@/lib/geo";
import { formatDate, formatDateShort, formatTime, formatRupees } from "@/lib/format";
import {
  DESIGNATIONS,
  EXPECTED_CONVERSIONS,
  LEAD_TYPES,
  NEXT_ACTIONS,
  OPPORTUNITIES,
  OUTCOMES,
  type LeadPriority,
  type VisitOutcome,
} from "@/lib/types";
import { queueVisit } from "@/lib/offline";
import LocationErrorModal from "@/components/LocationErrorModal";
import SiteSelector, { type SiteSelection } from "@/components/SiteSelector";

const PRIORITIES: LeadPriority[] = ["High", "Medium", "Low"];

export default function NewVisit() {
  const router = useRouter();
  const supabase = createClient();

  const [fix, setFix] = useState<GeoFix | null>(null);
  const [locating, setLocating] = useState(true);
  const [geoError, setGeoError] = useState<GeoError | null>(null);

  // Visit fields
  const [site, setSite] = useState<SiteSelection | null>(null);
  const [personMet, setPersonMet] = useState("");
  const [designation, setDesignation] = useState("");
  const [mobile, setMobile] = useState("");
  const [outcome, setOutcome] = useState<VisitOutcome | null>(null);
  const [notes, setNotes] = useState("");

  // Lead
  const [genLead, setGenLead] = useState<boolean | null>(null);
  const [leadType, setLeadType] = useState("");
  const [opportunity, setOpportunity] = useState<string[]>([]);
  const [estBusiness, setEstBusiness] = useState("");
  const [priority, setPriority] = useState<LeadPriority | null>(null);
  const [expected, setExpected] = useState("");
  const [followup, setFollowup] = useState("");
  const [nextAction, setNextAction] = useState("");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<null | {
    siteName: string;
    lead: boolean;
    potential: number | null;
    followup: string | null;
    queued: boolean;
  }>(null);

  const locate = useCallback(async () => {
    setLocating(true);
    setGeoError(null);
    try {
      const f = await captureLocation();
      setFix(f);
    } catch (e) {
      if (e instanceof GeoError) setGeoError(e);
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  function toggleOpportunity(o: string) {
    setOpportunity((prev) =>
      prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]
    );
  }

  const canSave =
    !!site && !!outcome && !!fix && (genLead === false || genLead === true);

  async function save() {
    if (!fix || !site || !outcome) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const visitPayload = {
      visit_time: new Date().toISOString(),
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracy: fix.accuracy,
      address: fix.address ?? null,
      person_met: personMet.trim() || null,
      designation: designation || null,
      mobile: mobile.trim() || null,
      outcome,
      notes: notes.trim() || null,
    };

    const leadPayload =
      genLead === true
        ? {
            lead_type: leadType || null,
            opportunity,
            estimated_monthly_business: estBusiness
              ? Number(estBusiness)
              : null,
            priority,
            expected_conversion: expected || null,
            next_followup_date: followup || null,
            next_action: nextAction || null,
          }
        : null;

    const siteName = site.kind === "existing" ? site.site.name : site.name;
    const potential = leadPayload?.estimated_monthly_business ?? null;

    // Offline -> queue and let the sync layer push it later.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await queueVisit({
        localId: crypto.randomUUID(),
        createdAt: Date.now(),
        userId: user.id,
        siteId: site.kind === "existing" ? site.site.id : null,
        newSite:
          site.kind === "new"
            ? {
                name: site.name,
                site_type: site.site_type,
                latitude: fix.latitude,
                longitude: fix.longitude,
                address: fix.address ?? null,
              }
            : null,
        visit: visitPayload,
        lead: leadPayload,
      });
      window.dispatchEvent(new Event("labiq:queued"));
      setSaving(false);
      setSuccess({
        siteName,
        lead: !!leadPayload,
        potential,
        followup: leadPayload?.next_followup_date ?? null,
        queued: true,
      });
      return;
    }

    try {
      // Resolve site.
      let siteId = site.kind === "existing" ? site.site.id : null;
      if (site.kind === "new") {
        const { data: newSite, error } = await supabase
          .from("sites")
          .insert({
            name: site.name,
            site_type: site.site_type,
            latitude: fix.latitude,
            longitude: fix.longitude,
            address: fix.address ?? null,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (error) throw error;
        siteId = newSite.id;
      }

      const { data: visit, error: vErr } = await supabase
        .from("visits")
        .insert({ ...visitPayload, user_id: user.id, site_id: siteId })
        .select("id")
        .single();
      if (vErr) throw vErr;

      if (leadPayload) {
        const { error: lErr } = await supabase.from("leads").insert({
          ...leadPayload,
          visit_id: visit.id,
          site_id: siteId,
          user_id: user.id,
        });
        if (lErr) throw lErr;
      }

      setSuccess({
        siteName,
        lead: !!leadPayload,
        potential,
        followup: leadPayload?.next_followup_date ?? null,
        queued: false,
      });
    } catch (e) {
      alert("Could not save visit: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ---- Success screen ----
  if (success) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-slate-100 px-6 text-center">
        <div className="mb-3 text-5xl">✓</div>
        <h1 className="text-2xl font-black">Visit Recorded</h1>
        {success.queued && (
          <p className="mt-1 text-sm font-semibold text-amber-600">
            Saved offline — will sync automatically
          </p>
        )}
        <p className="mt-3 text-xl font-bold">{success.siteName}</p>
        <p className="text-slate-500">
          {formatDate(new Date())} · {formatTime(new Date())}
        </p>
        <p className="mt-3 text-slate-600">📍 Location captured</p>

        <div className="mt-4 w-full space-y-1 rounded-2xl bg-white p-4 shadow-sm">
          <Row label="Lead" value={success.lead ? "YES" : "NO"} />
          {success.lead && (
            <Row
              label="Potential"
              value={
                success.potential
                  ? `${formatRupees(success.potential)}/month`
                  : "—"
              }
            />
          )}
          {success.followup && (
            <Row
              label="Next Follow-up"
              value={formatDateShort(success.followup)}
            />
          )}
        </div>

        <button
          className="btn btn-primary btn-lg mt-6 w-full"
          onClick={() => router.replace("/dashboard")}
        >
          Done
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-100 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
        <button
          onClick={() => router.back()}
          className="text-2xl text-slate-500"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">New Visit</h1>
      </header>

      <div className="space-y-4 px-4 pt-4">
        {/* Location */}
        <section className="card">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Location
          </p>
          {locating ? (
            <p className="mt-2 animate-pulse text-slate-500">
              📍 Capturing GPS…
            </p>
          ) : fix ? (
            <div className="mt-1">
              <p className="font-bold text-green-700">📍 Location Captured</p>
              <p className="text-slate-600">
                {shortLocality(fix.address) ??
                  `${fix.latitude.toFixed(5)}, ${fix.longitude.toFixed(5)}`}
              </p>
              <p className="text-xs text-slate-400">
                Accuracy ±{Math.round(fix.accuracy)}m
              </p>
              <a
                className="mt-1 inline-block text-sm font-semibold text-brand"
                href={googleMapsLink(fix.latitude, fix.longitude)}
                target="_blank"
                rel="noreferrer"
              >
                Open map →
              </a>
            </div>
          ) : (
            <button className="btn btn-ghost mt-2 w-full" onClick={locate}>
              Retry location
            </button>
          )}
        </section>

        {/* Site */}
        <section className="card">
          <p className="label">Site Name *</p>
          <SiteSelector value={site} onChange={setSite} />
        </section>

        {/* Person met */}
        <section className="card space-y-3">
          <div>
            <label className="label">Person Met</label>
            <input
              className="field"
              placeholder="e.g. Dr Rao"
              value={personMet}
              onChange={(e) => setPersonMet(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Designation</label>
            <select
              className="field"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            >
              <option value="">Select…</option>
              {DESIGNATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Mobile Number (optional)</label>
            <input
              className="field"
              type="tel"
              inputMode="tel"
              placeholder="10-digit mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
        </section>

        {/* Outcome */}
        <section className="card">
          <p className="label">Visit Outcome *</p>
          <div className="grid grid-cols-1 gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.value}
                onClick={() => setOutcome(o.value)}
                className={`btn justify-start ${
                  outcome === o.value
                    ? "text-white"
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
                style={
                  outcome === o.value ? { backgroundColor: o.color } : undefined
                }
              >
                {o.emoji} {o.value}
              </button>
            ))}
          </div>
        </section>

        {/* Notes */}
        <section className="card">
          <label className="label">Visit Notes</label>
          <textarea
            className="field min-h-[96px]"
            placeholder="Example: Met Dr Rao. Currently sending molecular samples to Hyderabad. Interested in Lab IQ B2B pricing."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        {/* Generate lead */}
        <section className="card">
          <p className="label">Generate Lead?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              className={`btn ${
                genLead === true
                  ? "btn-primary"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
              onClick={() => setGenLead(true)}
            >
              Yes
            </button>
            <button
              className={`btn ${
                genLead === false
                  ? "btn-primary"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
              onClick={() => setGenLead(false)}
            >
              No
            </button>
          </div>
        </section>

        {/* Lead form */}
        {genLead === true && (
          <section className="card space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              Lead Details
            </p>

            <div>
              <label className="label">Lead Type</label>
              <select
                className="field"
                value={leadType}
                onChange={(e) => setLeadType(e.target.value)}
              >
                <option value="">Select…</option>
                {LEAD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Opportunity (select all)</label>
              <div className="flex flex-wrap gap-2">
                {OPPORTUNITIES.map((o) => (
                  <button
                    key={o}
                    onClick={() => toggleOpportunity(o)}
                    className={`chip border ${
                      opportunity.includes(o)
                        ? "bg-brand text-white border-brand"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Estimated Monthly Business (₹)</label>
              <input
                className="field"
                type="number"
                inputMode="numeric"
                placeholder="75000"
                value={estBusiness}
                onChange={(e) => setEstBusiness(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`btn ${
                      priority === p
                        ? "btn-primary"
                        : "bg-white text-slate-700 border border-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Expected Conversion</label>
              <div className="flex flex-wrap gap-2">
                {EXPECTED_CONVERSIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setExpected(c)}
                    className={`chip border ${
                      expected === c
                        ? "bg-brand text-white border-brand"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Next Follow-up</label>
              <input
                className="field"
                type="date"
                value={followup}
                onChange={(e) => setFollowup(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Next Action</label>
              <div className="flex flex-wrap gap-2">
                {NEXT_ACTIONS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setNextAction(a)}
                    className={`chip border ${
                      nextAction === a
                        ? "bg-brand text-white border-brand"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Sticky save */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-slate-200 bg-white p-3"
        style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}
      >
        <button
          className="btn btn-primary btn-lg w-full"
          disabled={!canSave || saving}
          onClick={save}
        >
          {saving
            ? "Saving…"
            : genLead === true
            ? "Save Visit + Lead"
            : "Save Visit"}
        </button>
        {!canSave && !saving && (
          <p className="mt-1 text-center text-xs text-slate-400">
            {!fix
              ? "Waiting for GPS…"
              : !site
              ? "Select a site"
              : !outcome
              ? "Select an outcome"
              : "Choose whether to generate a lead"}
          </p>
        )}
      </div>

      <LocationErrorModal
        error={geoError}
        busy={locating}
        onCancel={() => router.back()}
        onRetry={locate}
      />
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
