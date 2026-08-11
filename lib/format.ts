// Date / time / currency formatting helpers (India locale).

export function formatTime(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatDayHeading(d: Date = new Date()): string {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

// Full rupee amount, e.g. ₹75,000
export function formatRupees(n: number | null | undefined): string {
  if (n == null) return "—";
  return "₹" + n.toLocaleString("en-IN");
}

// Compact Indian rupees for summaries, e.g. ₹14.2L, ₹2.4Cr
export function formatRupeesCompact(n: number | null | undefined): string {
  if (n == null || n === 0) return "₹0";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return "₹" + n.toLocaleString("en-IN");
}

// Difference between two timestamps as "9h 06m".
export function workingHours(
  from: string | Date,
  to: string | Date
): string {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  let mins = Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  mins = mins % 60;
  return `${h}h ${String(mins).padStart(2, "0")}m`;
}

// Start of today / helpers for "today" filters.
export function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameDay(a: string | Date, b: Date = new Date()): boolean {
  const d = typeof a === "string" ? new Date(a) : a;
  return (
    d.getFullYear() === b.getFullYear() &&
    d.getMonth() === b.getMonth() &&
    d.getDate() === b.getDate()
  );
}
