"use client";

import { useMemo, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import Link from "next/link";
import { formatDateShort, formatRupees, formatTime } from "@/lib/format";
import { outcomeMeta, type VisitWithRelations } from "@/lib/types";

const containerStyle = { width: "100%", height: "100%" };

// India-ish default center (Andhra Pradesh) until we have points.
const DEFAULT_CENTER = { lat: 16.5, lng: 81.5 };

export default function ManagerMap({
  visits,
}: {
  visits: VisitWithRelations[];
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey ?? "",
  });
  const [active, setActive] = useState<string | null>(null);

  const points = useMemo(
    () => visits.filter((v) => v.latitude != null && v.longitude != null),
    [visits]
  );

  const center = points.length
    ? { lat: points[0].latitude!, lng: points[0].longitude! }
    : DEFAULT_CENTER;

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-200 p-6 text-center text-sm text-slate-500">
        Set <code className="mx-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to
        enable the map.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-200 text-slate-500">
        Loading map…
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={points.length ? 11 : 6}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {points.map((v) => {
        const m = outcomeMeta(v.outcome);
        return (
          <Marker
            key={v.id}
            position={{ lat: v.latitude!, lng: v.longitude! }}
            onClick={() => setActive(v.id)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: m?.color ?? "#0d9488",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            }}
          >
            {active === v.id && (
              <InfoWindow onCloseClick={() => setActive(null)}>
                <div className="min-w-[160px] text-slate-800">
                  <p className="text-sm font-bold">
                    {v.site?.name ?? "Unknown site"}
                  </p>
                  <p className="text-xs text-slate-500">{v.user?.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateShort(v.visit_time)} · {formatTime(v.visit_time)}
                  </p>
                  {m && (
                    <p className="mt-1 text-xs">
                      {m.emoji} {m.value}
                    </p>
                  )}
                  <p className="text-xs">
                    Lead: <b>{v.lead ? "YES" : "NO"}</b>
                  </p>
                  {v.lead?.estimated_monthly_business != null && (
                    <p className="text-xs">
                      {formatRupees(v.lead.estimated_monthly_business)}/month
                    </p>
                  )}
                  <Link
                    href={`/visits/${v.id}`}
                    className="mt-1 inline-block text-xs font-semibold text-brand"
                  >
                    View details →
                  </Link>
                </div>
              </InfoWindow>
            )}
          </Marker>
        );
      })}
    </GoogleMap>
  );
}
