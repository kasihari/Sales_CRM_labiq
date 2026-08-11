# Lab IQ Sales — MVP

A mobile-first PWA for the Lab IQ field sales team. Five core functions only:

1. **Punch In / Punch Out** (with GPS)
2. **GPS Location Capture** (browser Geolocation API)
3. **Site Visit Recording**
4. **Lead Generation**
5. **Manager Map** (Google Maps)

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + RLS) · Google Maps**. Installable to the Android / iPhone home screen and works partly offline.

---

## 1. Prerequisites

- Node.js 18+ (tested on Node 24)
- A [Supabase](https://supabase.com) project
- A Google Cloud project with **Maps JavaScript API** + **Geocoding API** enabled

## 2. Configure environment

Copy the example and fill in real values:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` public key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud → Credentials → browser key (restrict by HTTP referrer) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Leave blank unless you add server scripts. **Never** expose it in the browser. |

## 3. Create the database

In the Supabase **SQL Editor**, run the whole of:

```
supabase/schema.sql
```

This creates the `users`, `attendance`, `sites`, `visits`, `leads` tables, the
`handle_new_user` trigger (auto-creates a profile for each new auth user), the
`is_manager()` helper, and **Row Level Security** policies:

- **Salesperson** can read/write only their own attendance, visits and leads.
- **Manager** can read everything.
- **Sites** are a shared catalogue any signed-in user can read and add to.

## 4. Create users

1. Supabase → **Authentication → Users → Add user** (email + password). Do this
   for each salesperson and manager. A profile row is created automatically.
2. To make someone a **manager**, run in the SQL editor (see `supabase/seed.sql`):

   ```sql
   update public.users set role = 'manager' where email = 'manager@labiq.in';
   ```

   Or set `role: manager` in the user's **User Metadata** when adding them.
3. Optionally set display names and seed a few sites — see `supabase/seed.sql`.

## 5. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 on a phone (or Chrome device emulation).

- Salespeople land on `/dashboard`.
- Managers land on `/admin`.

### Build for production

```bash
npm run build
npm start
```

Deploy to any Node host or **Vercel**. Add the same environment variables in the
host's settings. Serve over **HTTPS** — the Geolocation API and PWA install both
require a secure context.

---

## App structure

```
app/
  login/                 Email + password sign-in
  (app)/                 Salesperson shell (bottom nav)
    dashboard/           Home: attendance, today counts, recent visits
    visits/              Visit history + [id] detail
    leads/               Leads list with status updates
  new-visit/             Full-screen visit + lead capture flow
  admin/                 Manager area (role-guarded)
    page.tsx             Summary + filters + Google Map + visit list
    salesperson/[id]/    Per-salesperson day view
components/              Map, site selector, sync banner, modals, nav
lib/
  supabase/              Browser / server / middleware clients
  geo.ts                 Geolocation + reverse geocoding
  offline.ts             IndexedDB queue + auto-sync
  format.ts              Date / time / ₹ formatting
  types.ts               Domain types + option lists
public/
  manifest.json  sw.js  offline.html  icons/   PWA assets
supabase/
  schema.sql   seed.sql
```

## Notes

- **GPS is mandatory** for punch in, punch out and every visit. Poor accuracy
  (worse than 150 m) or denied permission shows a "Try Again" prompt — a manual
  location is never silently used.
- **Offline:** if there's no connection when saving a visit, it's queued in
  IndexedDB and synced automatically when back online (banner shows
  "🟡 N visits waiting to sync" → "🟢 All visits synced").
- **PWA install:** Chrome (Android) → menu → *Add to Home screen*; iOS Safari →
  Share → *Add to Home Screen*.
- This is the **Phase 1** MVP. Quotations, invoicing, commissions, LIMS/WhatsApp
  integration, reporting, etc. are intentionally **out of scope**.
```
