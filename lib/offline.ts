"use client";

// Minimal IndexedDB-backed queue for recording visits while offline.
// A pending record carries everything needed to create the site (if new),
// the visit, and an optional lead once connectivity returns.

import type { SupabaseClient } from "@supabase/supabase-js";

const DB_NAME = "labiq-sales";
const STORE = "pending-visits";
const DB_VERSION = 1;

export interface PendingVisit {
  localId: string;
  createdAt: number;
  userId: string;
  siteId?: string | null;
  newSite?: {
    name: string;
    site_type: string;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
  } | null;
  visit: {
    visit_time: string;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    address: string | null;
    person_met: string | null;
    designation: string | null;
    mobile: string | null;
    outcome: string | null;
    notes: string | null;
  };
  lead?: {
    lead_type: string | null;
    opportunity: string[];
    estimated_monthly_business: number | null;
    priority: string | null;
    expected_conversion: string | null;
    next_followup_date: string | null;
    next_action: string | null;
  } | null;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "localId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueVisit(record: PendingVisit): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getPendingVisits(): Promise<PendingVisit[]> {
  const db = await openDB();
  const items = await new Promise<PendingVisit[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as PendingVisit[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return items;
}

async function removePending(localId: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(localId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function pendingCount(): Promise<number> {
  try {
    return (await getPendingVisits()).length;
  } catch {
    return 0;
  }
}

// Push one pending record to Supabase. Returns true on success.
async function syncOne(
  supabase: SupabaseClient,
  rec: PendingVisit
): Promise<boolean> {
  let siteId = rec.siteId ?? null;

  if (!siteId && rec.newSite) {
    const { data: site, error } = await supabase
      .from("sites")
      .insert({
        name: rec.newSite.name,
        site_type: rec.newSite.site_type,
        latitude: rec.newSite.latitude,
        longitude: rec.newSite.longitude,
        address: rec.newSite.address,
        created_by: rec.userId,
      })
      .select("id")
      .single();
    if (error || !site) return false;
    siteId = site.id;
  }

  const { data: visit, error: vErr } = await supabase
    .from("visits")
    .insert({ ...rec.visit, user_id: rec.userId, site_id: siteId })
    .select("id")
    .single();
  if (vErr || !visit) return false;

  if (rec.lead) {
    const { error: lErr } = await supabase.from("leads").insert({
      ...rec.lead,
      visit_id: visit.id,
      site_id: siteId,
      user_id: rec.userId,
    });
    if (lErr) return false;
  }

  await removePending(rec.localId);
  return true;
}

// Attempt to sync everything queued. Returns count still pending afterwards.
export async function syncPending(supabase: SupabaseClient): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return pendingCount();
  }
  const items = await getPendingVisits();
  for (const rec of items) {
    try {
      await syncOne(supabase, rec);
    } catch {
      // keep it queued; will retry on next sync
    }
  }
  return pendingCount();
}
