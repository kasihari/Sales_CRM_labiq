"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { pendingCount, syncPending } from "@/lib/offline";

// Banner that shows offline / pending-sync state and auto-syncs when online.
export default function SyncStatus() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    setOnline(navigator.onLine);

    async function refresh() {
      setPending(await pendingCount());
    }

    async function trySync() {
      setOnline(navigator.onLine);
      if (!navigator.onLine) return;
      const before = await pendingCount();
      if (before === 0) return;
      const after = await syncPending(supabase);
      setPending(after);
      if (after === 0 && before > 0) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 4000);
      }
    }

    refresh();
    trySync();

    const onOnline = () => trySync();
    const onOffline = () => setOnline(false);
    const onQueued = () => refresh();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("labiq:queued", onQueued);
    const t = setInterval(trySync, 30000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("labiq:queued", onQueued);
      clearInterval(t);
    };
  }, []);

  if (!online && pending === 0) {
    return (
      <div className="rounded-xl bg-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-600">
        ⚫ Offline — you can still record visits
      </div>
    );
  }
  if (pending > 0) {
    return (
      <div className="rounded-xl bg-amber-100 px-3 py-2 text-center text-sm font-medium text-amber-800">
        🟡 {pending} visit{pending > 1 ? "s" : ""} waiting to sync
      </div>
    );
  }
  if (justSynced) {
    return (
      <div className="rounded-xl bg-green-100 px-3 py-2 text-center text-sm font-medium text-green-800">
        🟢 All visits synced
      </div>
    );
  }
  return null;
}
