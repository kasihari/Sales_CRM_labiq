"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SITE_TYPES, type Site, type SiteType } from "@/lib/types";

export type SiteSelection =
  | { kind: "existing"; site: Site }
  | { kind: "new"; name: string; site_type: SiteType };

// Search existing sites or create a new one. Selection is reported upward;
// a brand-new site is only persisted when the visit is saved (offline-safe).
export default function SiteSelector({
  value,
  onChange,
}: {
  value: SiteSelection | null;
  onChange: (s: SiteSelection | null) => void;
}) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Site[]>([]);
  const [open, setOpen] = useState(false);
  const [newType, setNewType] = useState<SiteType>("Hospital");
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (value) return; // stop searching once chosen
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const { data } = await supabase
        .from("sites")
        .select("*")
        .ilike("name", `%${query.trim()}%`)
        .order("name")
        .limit(8);
      setResults((data as Site[]) ?? []);
      setOpen(true);
    }, 250);
    return () => clearTimeout(debounce.current);
  }, [query, supabase, value]);

  if (value) {
    return (
      <div className="rounded-xl border border-brand/30 bg-brand/5 p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold">
              {value.kind === "existing" ? value.site.name : value.name}
            </p>
            <p className="text-sm text-slate-500">
              {value.kind === "existing" ? value.site.site_type : value.site_type}
              {value.kind === "new" && " · New site"}
            </p>
            {value.kind === "existing" &&
              value.site.latitude != null && (
                <p className="mt-1 text-xs text-slate-400">
                  Stored location: {value.site.latitude.toFixed(4)},{" "}
                  {value.site.longitude?.toFixed(4)}
                </p>
              )}
          </div>
          <button
            className="text-sm font-semibold text-brand"
            onClick={() => {
              onChange(null);
              setQuery("");
              setResults([]);
            }}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  const trimmed = query.trim();
  const exactMatch = results.some(
    (r) => r.name.toLowerCase() === trimmed.toLowerCase()
  );

  return (
    <div>
      <input
        className="field"
        placeholder="Search or type a site name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
      />

      {open && results.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {results.map((s) => (
            <li key={s.id}>
              <button
                className="flex w-full flex-col items-start border-b border-slate-100 px-4 py-3 text-left last:border-0 active:bg-slate-50"
                onClick={() => onChange({ kind: "existing", site: s })}
              >
                <span className="font-semibold">{s.name}</span>
                <span className="text-xs text-slate-500">
                  {s.site_type}
                  {s.city ? ` · ${s.city}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {trimmed.length >= 2 && !exactMatch && (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-3">
          <p className="text-sm font-semibold text-slate-600">
            Create new site: “{trimmed}”
          </p>
          <select
            className="field mt-2"
            value={newType}
            onChange={(e) => setNewType(e.target.value as SiteType)}
          >
            {SITE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary mt-3 w-full"
            onClick={() =>
              onChange({ kind: "new", name: trimmed, site_type: newType })
            }
          >
            + Add “{trimmed}”
          </button>
        </div>
      )}
    </div>
  );
}
