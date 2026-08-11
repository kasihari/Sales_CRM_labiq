# Lab IQ Sales — Setup & Operations Manual

A complete, step-by-step guide to getting Lab IQ Sales live and using it.
No prior coding experience needed for Parts A–D.

**Contents**
- [Part A — One-time setup (you / admin)](#part-a--one-time-setup-you--admin)
- [Part B — Install the app on phones](#part-b--install-the-app-on-phones)
- [Part C — Daily use: Salesperson](#part-c--daily-use-salesperson)
- [Part D — Daily use: Manager](#part-d--daily-use-manager)
- [Part E — Running it on your own computer (optional, for developers)](#part-e--running-it-on-your-own-computer-optional-for-developers)
- [Part F — Troubleshooting](#part-f--troubleshooting)

---

## Part A — One-time setup (you / admin)

You'll create three free accounts and connect them. Budget ~30 minutes.

### Step 1 — Accounts you need
- **GitHub** — already done: https://github.com/kasihari/Sales_CRM_labiq
- **Supabase** — the database + login system → https://supabase.com
- **Google Cloud** — for the map → https://console.cloud.google.com
- **Vercel** — hosts the website → https://vercel.com

Sign up for the three you don't have (you can use "Sign in with GitHub" for Supabase and Vercel).

---

### Step 2 — Create the Supabase project
1. Go to https://supabase.com/dashboard and click **New project**.
2. Name it `lab-iq-sales`, choose a **strong database password** (save it somewhere safe), pick the region closest to you (e.g. **Mumbai / South Asia**), and click **Create new project**.
3. Wait ~2 minutes for it to finish provisioning.

---

### Step 3 — Create the database tables
1. In the Supabase left sidebar, open **SQL Editor**.
2. Click **+ New query**.
3. Open the file `supabase/schema.sql` from this project, copy **all** of it, and paste it into the editor.
4. Click **Run** (or press Ctrl/Cmd + Enter).
5. You should see *"Success. No rows returned."* This created all five tables (users, attendance, sites, visits, leads) and the security rules.

---

### Step 4 — Copy your Supabase keys
1. In Supabase, click the **gear / Project Settings** (bottom-left) → **API**.
2. Copy and keep these two values — you'll paste them into Vercel in Step 6:
   - **Project URL** → for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. ⚠️ **Never** share or paste the **service_role** key anywhere public — it is not needed for this app.

---

### Step 5 — Get a Google Maps key
1. Go to https://console.cloud.google.com and create a project (top bar → **New Project** → name it `lab-iq-maps`).
2. Left menu → **APIs & Services → Library**. Search for and **Enable** both:
   - **Maps JavaScript API**
   - **Geocoding API** (turns GPS coordinates into an address)
3. Left menu → **APIs & Services → Credentials → + Create Credentials → API key**.
4. Copy the key — this is your `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
5. You'll lock it down to your website in Step 9 (after you know the web address).

> Google requires a billing account for Maps, but includes a large free monthly credit that easily covers a sales team. Set a budget alert if you want peace of mind.

---

### Step 6 — Deploy to Vercel
1. Go to https://vercel.com/new.
2. **Import** the repository `kasihari/Sales_CRM_labiq`.
3. Before clicking Deploy, open **Environment Variables** and add these three
   (Name on the left, the value you copied on the right):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon key |
   | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | your Google Maps key |

4. Click **Deploy**. After ~1–2 minutes you'll get a web address like
   `https://sales-crm-labiq.vercel.app`. **This is your app.** Bookmark it.

> Every time you push new code to GitHub, Vercel re-deploys automatically.

---

### Step 7 — Create user logins
Each salesperson and manager needs an email + password.

1. In Supabase → **Authentication → Users → Add user → Create new user**.
2. Enter their **email** and a **password**, tick **Auto Confirm User**, click **Create user**.
3. Repeat for everyone (all salespeople + at least one manager).

A profile is created automatically for each new user. By default everyone is a **salesperson**.

---

### Step 8 — Set names and promote your manager
1. In Supabase → **SQL Editor → + New query**.
2. Give people display names (repeat per person):
   ```sql
   update public.users set name = 'Rajesh Kumar', phone = '9000000001'
   where email = 'rajesh@labiq.in';
   ```
3. Make someone a **manager** (they'll see the `/admin` dashboard + map):
   ```sql
   update public.users set role = 'manager'
   where email = 'manager@labiq.in';
   ```
4. Click **Run**. (These examples are also in `supabase/seed.sql`.)

---

### Step 9 — Lock down the Google Maps key
1. Back in Google Cloud → **APIs & Services → Credentials** → click your key.
2. Under **Application restrictions** → choose **Websites**, and add your Vercel
   address, e.g. `https://sales-crm-labiq.vercel.app/*`.
3. Under **API restrictions** → **Restrict key** → tick **Maps JavaScript API**
   and **Geocoding API**. **Save**.

This prevents anyone else from using your key.

### Setup checklist ✅
- [ ] Supabase project created
- [ ] `schema.sql` run successfully
- [ ] Supabase URL + anon key copied
- [ ] Google Maps key created, both APIs enabled
- [ ] Vercel deployed with all 3 environment variables
- [ ] User logins created
- [ ] Manager promoted, names set
- [ ] Maps key restricted to your Vercel domain

You're live. Send the Vercel link + each person's email/password to your team.

---

## Part B — Install the app on phones

The app runs in the browser but installs to the home screen like a normal app.

### Android (Chrome)
1. Open your Vercel link in **Chrome**.
2. Tap the **⋮** menu (top-right) → **Add to Home screen** → **Install**.
3. The "Lab IQ" icon appears on the home screen. Open it from there.

### iPhone (Safari)
1. Open your Vercel link in **Safari** (must be Safari, not Chrome).
2. Tap the **Share** button (square with an up-arrow) → **Add to Home Screen** → **Add**.
3. The "Lab IQ" icon appears on the home screen.

> **Important:** the first time each person opens the app, allow **Location**
> access when the phone asks. GPS is required to punch in and record visits.

---

## Part C — Daily use: Salesperson

### 1. Login
Open the Lab IQ app → enter your email + password → **Login**.

### 2. Punch In (start of day)
- On the home screen, tap the green **🟢 Punch In** button.
- Allow location if asked. Your time and GPS location are recorded.
- The card now shows **Punched In**, the time, and your location.

### 3. Record a visit
- Tap **+ New Visit** (the most important button — always on the home screen).
- Your GPS is captured automatically ("📍 Location Captured").
- **Site:** type the name. Pick an existing site, or tap **+ Add "…"** to create a new one and choose its type.
- **Person Met / Designation / Mobile** (mobile is optional).
- **Visit Outcome:** tap one (Positive, Interested, Follow-up Required, etc.).
- **Notes:** anything useful (optional).

### 4. Generate a lead (optional)
- At **Generate Lead?** tap **Yes** to open the lead form (or **No** to skip).
- Fill Lead Type, Opportunity (tap all that apply), estimated ₹/month, Priority, Expected conversion, Next follow-up date, Next action.

### 5. Save
- Tap **Save Visit** (or **Save Visit + Lead**). You'll see a **✓ Visit Recorded** confirmation. Tap **Done** to return home.

### 6. Punch Out (end of day)
- Tap **🔴 Punch Out** → review your working hours → confirm.
- You'll see **✓ Day Completed** with your visits, leads and hours.

### Working offline
- No signal? You can still record visits — they're saved on the phone.
- A yellow banner shows **🟡 N visits waiting to sync**.
- When signal returns they upload automatically → **🟢 All visits synced**.

### Your history
- **Visits** tab (bottom): every visit you've recorded; tap one for full details.
- **Leads** tab: your leads; change a lead's **Status** (New → Interested → Proposal Sent → Negotiation → Won / Lost) from the dropdown.

---

## Part D — Daily use: Manager

Log in with a **manager** account — you land on the **Manager Dashboard** (`/admin`).

### Top summary
Salespeople active today, total visits, new leads, and total potential business.

### The map (main feature)
- Every visit is a **coloured dot** (colour = outcome). Tap a dot to see the site,
  salesperson, time, outcome, and lead value; tap **View details** for the full visit.

### Filters (above the map)
- **Date:** Today / Yesterday / This Week / Custom date
- **Salesperson:** All or one person
- **Lead:** All / Lead / No Lead
- **Outcome:** All or a specific outcome

The map and the list below update instantly as you change filters.

### Visit list
Below the map — every matching visit (salesperson, site, time, lead ✓/✗). Tap to open.

### One salesperson's day
Scroll to **Salespeople** and tap a name to see their punch-in/out times, visits,
leads, potential business, and their visit locations on a map.

---

## Part E — Running it on your own computer (optional, for developers)

```bash
# 1. Get the code
git clone https://github.com/kasihari/Sales_CRM_labiq.git
cd Sales_CRM_labiq

# 2. Install dependencies (needs Node.js 18+)
npm install

# 3. Add your keys
cp .env.example .env.local
#    then edit .env.local and paste your Supabase + Google Maps values

# 4. Run it
npm run dev
```

Open http://localhost:3000. Note: GPS and "Add to Home Screen" only work over
**HTTPS** (i.e. the Vercel URL) or `localhost` — not over a plain IP.

To ship a change: commit and push to GitHub; Vercel deploys it automatically.
```bash
git add -A
git commit -m "describe your change"
git push
```

---

## Part F — Troubleshooting

| Problem | Fix |
| --- | --- |
| **"Location permission is required"** | Allow location for the site in your phone's browser settings, then tap **Try Again**. On iPhone: Settings → Safari → Location → Allow. |
| **"Location accuracy is low"** | Move outdoors / away from tall buildings and tap **Try Again**. GPS needs open sky. |
| **Can't log in** | The account must be created in Supabase → Authentication → Users, with **Auto Confirm** ticked. Double-check the email/password. |
| **Manager sees the salesperson screen** | Their role wasn't set. Run the `update ... set role = 'manager'` SQL from Step 8. |
| **Map area is blank / grey** | The Google Maps key is missing, not enabled, or restricted to the wrong domain. Recheck Steps 5 & 9, and that `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in Vercel. |
| **Addresses don't appear (only coordinates)** | Enable **Geocoding API** in Google Cloud (Step 5). |
| **Changed env vars but nothing changed** | In Vercel, go to **Deployments → Redeploy** after editing environment variables. |
| **Visits stuck on "waiting to sync"** | The phone is offline or was closed. Reopen the app while online; it syncs automatically. |

---

Built for Lab IQ. Phase 1 MVP — attendance → location → visit → lead → manager map.
```
