"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  formatDate,
  formatDateShort,
  formatRupees,
  formatTime,
} from "@/lib/format";
import { googleMapsLink } from "@/lib/geo";
import { outcomeMeta, type Lead, type Site, type Visit } from "@/lib/types";

interface FullVisit extends Visit {
  site: Site | null;
  lead: Lead | null;
}

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [visit, setVisit] = useState<FullVisit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("visits")
        .select("*, site:sites(*), lead:leads(*)")
        .eq("id", id)
        .single();
      if (data) {
        const v = data as any;
        setVisit({
          ...v,
          lead: Array.isArray(v.lead) ? v.lead[0] ?? null : v.lead,
        });
      }
      setLoading(false);
    })();
  }, [id, supabase]);

  if (loading) {
    return (
      <main className="px-4 pt-6">
        <div className="h-40 animate-pulse rounded-2xl bg-white" />
      </main>
    );
  }
  if (!visit) {
    return (
      <main className="px-4 pt-10 text-center text-slate-500">
        Visit not found.
      </main>
    );
  }

  const m = outcomeMeta(visit.outcome);

  return (
    <main className="px-4 pt-4">
      <button
        onClick={() => router.back()}
        className="mb-2 text-2xl text-slate-500"
        aria-label="Back"
      >
        ←
      </button>

      <h1 className="text-2xl font-black">{visit.site?.name ?? "Unknown site"}</h1>
      <p className="text-slate-500">
        {formatDate(visit.visit_time)} · {formatTime(visit.visit_time)}
      </p>
      {visit.site?.site_type && (
        <span className="chip mt-2 bg-slate-100 text-slate-600">
          {visit.site.site_type}
        </span>
      )}

      <section className="card mt-4 space-y-2">
        {m && (
          <div>
            <span className="label">Outcome</span>
            <span
              className="chip text-white"
              style={{ backgroundColor: m.color }}
            >
              {m.emoji} {m.value}
            </span>
          </div>
        )}
        {visit.person_met && (
          <Detail label="Person Met" value={visit.person_met} />
        )}
        {visit.designation && (
          <Detail label="Designation" value={visit.designation} />
        )}
        {visit.mobile && (
          <Detail
            label="Mobile"
            value={
              <a href={`tel:${visit.mobile}`} className="text-brand">
                {visit.mobile}
              </a>
            }
          />
        )}
        {visit.notes && <Detail label="Notes" value={visit.notes} />}
      </section>

      {/* Location */}
      <section className="card mt-4">
        <span className="label">📍 Location</span>
        {visit.address ? (
          <p className="text-slate-700">{visit.address}</p>
        ) : (
          <p className="text-slate-500">
            {visit.latitude?.toFixed(5)}, {visit.longitude?.toFixed(5)}
          </p>
        )}
        {visit.accuracy != null && (
          <p className="text-xs text-slate-400">
            Accuracy ±{Math.round(visit.accuracy)}m
          </p>
        )}
        {visit.latitude != null && (
          <a
            className="mt-1 inline-block text-sm font-semibold text-brand"
            href={googleMapsLink(visit.latitude, visit.longitude!)}
            target="_blank"
            rel="noreferrer"
          >
            Open in Google Maps →
          </a>
        )}
      </section>

      {/* Lead */}
      {visit.lead && (
        <section className="card mt-4 space-y-2">
          <span className="label">🎯 Lead</span>
          {visit.lead.lead_type && (
            <Detail label="Type" value={visit.lead.lead_type} />
          )}
          {visit.lead.opportunity?.length > 0 && (
            <Detail
              label="Opportunity"
              value={visit.lead.opportunity.join(", ")}
            />
          )}
          {visit.lead.estimated_monthly_business != null && (
            <Detail
              label="Potential"
              value={`${formatRupees(
                visit.lead.estimated_monthly_business
              )}/month`}
            />
          )}
          {visit.lead.priority && (
            <Detail label="Priority" value={visit.lead.priority} />
          )}
          {visit.lead.expected_conversion && (
            <Detail label="Expected" value={visit.lead.expected_conversion} />
          )}
          {visit.lead.next_followup_date && (
            <Detail
              label="Follow-up"
              value={formatDateShort(visit.lead.next_followup_date)}
            />
          )}
          {visit.lead.next_action && (
            <Detail label="Next Action" value={visit.lead.next_action} />
          )}
          <Detail label="Status" value={visit.lead.status} />
        </section>
      )}
    </main>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <p className="text-slate-700">{value}</p>
    </div>
  );
}
