# Kokromoti Web

**Election Intelligence. Power to the People.**

Next.js frontend for [Kokromoti](https://kokromoti.aiei-africa.org), Ghana's election
results and intelligence platform. Built by Ayivi Solutions Limited, operated by
AIEI — African Institute for Electoral Intelligence.

UI/UX is a faithful rebuild of the v10 HTML prototype — same layout, same colour
system, same interaction patterns — wired to real historical election data
(1996–2016 currently) via [`kokromoti-api`](https://github.com/aiei-africa/kokromoti-api)
instead of v10's simulated data.

## Stack

- Next.js 14 (App Router)
- React 18, TypeScript
- Plain CSS (extracted directly from the v10 prototype — no Tailwind/CSS-in-JS)
- No state library — local component state + `fetch` against `kokromoti-api`

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Point this at whichever `kokromoti-api` instance you're running against — local
(`localhost:3001`) or the live Railway deployment. **`kokromoti-api` must be
running for this app to show real data** — without it, every panel will fail to
load.

```bash
npm run dev
```

Open `http://localhost:3000`.

## Structure

```
src/
  app/
    layout.tsx       — root layout, theme restoration (day/night, matches v10)
    page.tsx          — main app shell: nav state, election selector
    globals.css        — v10's CSS, extracted verbatim
  components/
    TopBar.tsx          — logo, search, theme toggle, election type tabs
    BottomNav.tsx        — Results / Live / Favourites / Regions / Ghana
    CandidateResultRow.tsx — generalized N-candidate result display
    panels/
      ResultsPanel.tsx    — all constituencies, grouped by region
      GhanaPanel.tsx       — national summary (presidential + seat count)
      RegionsPanel.tsx     — 16 regions, tap to expand results
  lib/
    api.ts              — typed fetch wrapper for kokromoti-api
```

## Current status

**Built and wired to real data:** Results, Ghana, Regions.
**Deliberately stubbed:** Live (a 2028 feature — no station-level results exist
for historical elections), Favourites (needs sign-in, UI not built yet), News,
constituency/region drilldown overlays, search filtering.

One real deviation from v10 worth knowing: v10 hardcodes exactly two candidates
per race (NDC vs NPP, simulating a future two-horse contest). Real 1992–2016
data has multi-candidate fields — `CandidateResultRow` generalizes v10's visual
language (party pill, name, percentage, proportional bar) across however many
candidates actually ran, using each party's real colour from the database
rather than hardcoded NDC/NPP classes.

## Deployment

Deployed to Railway (`kokromoti-web-production.up.railway.app`), same project
as `kokromoti-api` (`aiei-production`). Required env var:
`NEXT_PUBLIC_API_URL` pointing at the live API — this is baked in at **build**
time (Next.js `NEXT_PUBLIC_*` convention), so changing it requires a rebuild,
not just an env update.

Full migration history, architecture decisions, and the complete data-integrity
log for the platform this frontend serves: see the Kokromoti Migration &
Architecture Record (maintained separately, ask Torgbui Gorni Treve IV / AIEI
for the current copy).

---
© 2026 AIEI / Ayivi Solutions Limited.
