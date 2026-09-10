# NEUROSAATHI GUARDIAN — Change & Handover Report

**Scope (per user decision):** "Hybrid map — both" (Leaflet/OSM online + SVG
schematic offline) and "Guardian/demo only" — nearly all effort was spent on the
location-safety system and its SIH demo simulator, with only minimal work
elsewhere (a caregiver nav entry, an elder safety nav entry, i18n labels needed by
the new UI, README + this report).

This report lists every file touched, new dependencies, environment notes, what is
**demo vs real**, exact run instructions, the tested flows, and the known
limitations & responsible-use guardrails.

---

## 1. What was built

The **NEUROSAATHI GUARDIAN** location-safety system:

- **Risk posture engine** (pure, deterministic) — home *geofence* + *familiar safe
  places* + *movement trail* → a four-level posture:
  `🟢 safe` → `🟡 attention` → `🟠 unusual` → `🔴 high`. `high` is reserved for the
  caregiver's explicit **Search Mode**.
- **Hybrid map** — real **Leaflet + OpenStreetMap** tiles when online; an
  **on-brand offline SVG schematic** when there is no network. Both render the
  same geo data (elder marker, home/safe geofences, trail, accuracy radius).
- **Caregiver location dashboard** (`/caregiver/location`) — risk banner, elder
  snapshot, map, **demo location simulator** (Home / Leave / Temple / Hospital /
  Grocery / Unknown), live-GPS mode via `navigator.geolocation`, home geofence
  config, safe-place manager, emergency contacts (with `tel:` calls), **Search
  Mode**, and an **on-device alarm** trigger.
- **Elder safety view** (`/safety`) — calm, reassuring status; one big **call
  caregiver** button; a full-screen **alarm overlay** when the caregiver triggers
  an alarm ("OK, I'm here").
- **DemoMode tour step 13** — lets judges try the location simulator inline during
  the `/demo` walkthrough.
- Debounced guardian **alerts** into the existing caregiver alert feed.

---

## 2. Files changed

### New files
| File | Purpose |
|---|---|
| `src/engine/guardian.ts` | Pure geo/risk engine — Haversine, point-in-geofence, risk ladder, `RISK_META`, formatting helpers. |
| `src/services/geolocation.ts` | `navigator.geolocation` wrapper — `startWatch`/`getCurrentOnce`, permission-denied detection, `clearWatch` cleanup. |
| `src/services/guardian.ts` | Controller — `evaluateFix` (fix → state + transition), debounce cooldowns, trail cap, `interpolateStep`. |
| `src/services/guardianSimulator.ts` | Deterministic demo moves + interpolated trails, all `simulated:true`. |
| `src/components/MapView.tsx` | Hybrid map — Leaflet online ↔ SVG schematic offline. |
| `src/pages/caregiver/Guardian.tsx` | Caregiver location dashboard. |
| `src/pages/patient/Safety.tsx` | Elder safety view. |
| `docs/guardian-report.md` | This report. |

### Modified files
| File | Change |
|---|---|
| `src/types.ts` | Added `GeoPoint`, `SafeLocation`, `LocationUpdate`, `RiskLevel`, `GuardianState`, `EmergencyContact`; `AppState` gained `guardian` + `emergencyContacts`, `version: 2`. |
| `src/data/demoData.ts` | Seeded Guwahati home + safe places + emergency contacts; `buildDemoState()` wires `guardian`/contacts; `version` bumped to 2. |
| `src/state/store.ts` | Reducer cases: `GUARDIAN_UPDATE`, `GUARDIAN_PATCH`, `CONFIGURE_HOME`, `ADD/UPDATE/REMOVE_SAFE_LOCATION`, `ADD/UPDATE/REMOVE_CONTACT`, `RESET_GUARDIAN`. |
| `src/state/AppContext.tsx` | Guardian controller wiring — `guardianStart/Stop/Simulate`, `toggleSearchMode`, `triggerAlarm/resolveAlarm`, `guardAlert` (debounced), `commitGuardFix`; `stateRef` for stale-closure safety; geolocation watch cleanup on unmount. |
| `src/services/storage.ts` | `loadState` deep-merges guardian/contacts defaults so old v1 persisted state migrates cleanly to v2. |
| `src/i18n/{en,hi,gu}.ts` | ~120 Guardian/Safety/Map keys + 4 form-label keys + 2 demo-step keys, in **English, Hindi, Gujarati**. |
| `src/components/layouts.tsx` | Added `/safety` to patient nav + speech; `.guardian.cg.nav` to caregiver nav + speech; `AlarmOverlay` in patient shell. |
| `src/App.tsx` | Routes `/safety` and `/caregiver/location`. |
| `src/pages/system/DemoMode.tsx` | Added step 13 (Location safety) with inline map + sim buttons. |
| `src/index.css` | Guardian map styles (Leaflet container, inline div-icon markers, offline zoom buttons). |
| `README.md` | Added Guardian showcase section. |

---

## 3. New dependencies

Added to `package.json` (all compatible with React 18):

- `leaflet@^1.9.4`
- `react-leaflet@^4.2.1` (the React-18-compatible branch — v5 requires React 19)
- `@types/leaflet@^1.9.9`

Install with `npm install` (already reflected in `package-lock.json`).

> If you ever `npm update` Leaflet packages, **keep `react-leaflet` on `^4`** —
> v5 requires React 19 and will break the build (`ERESOLVE`).

---

## 4. Environment & run

- Node + npm. Dev server: `npm install` → `npm run dev`.
- **Online map requires internet** to reach OpenStreetMap tiles. Without a network,
  the component automatically renders the **offline SVG schematic** (it reads
  `connectivity`/offline-simulation state). You can force the offline view by
  enabling "Simulate Offline" anywhere in the app.
- **Live GPS** requires browser permission (`navigator.geolocation`). On some
  sandboxed pages it is blocked; the dashboard shows a clear granted/denied state
  and always offers the **demo simulator** as an alternative.
- Production build: `npm run build` (verified passing — `tsc -b` + `vite build`).
  Vite reports a large chunk warning (Leaflet + recharts); acceptable for a demo —
  see Limitations.

Test flow (caregiver):
```
/dev  (or /)  →  choose Caregiver  →  /caregiver/location
  → tap "Home" sim → marker sits in geofence, status 🟢 safe
  → tap "Leave"   → status 🟡 attention, "left home" alert
  → tap "Unknown" → outside every zone, posture elevates
  → tap "Search Mode" → 🔴 high, critical alert
  → trigger alarm → elder /safety shows the full-screen overlay
  → tap safe place sim → back to 🟢 safe, OK / return-home alert
```

---

## 5. Demo vs real — honest labelling

| Layer | Real | Demo / Simulated |
|---|---|---|
| Position source | `navigator.geolocation` watch (GPS) | Simulator fixes, `simulated:true` |
| Map | Leaflet + OpenStreetMap tiles (online) | Offline SVG schematic, labelled **"Offline map"** |
| UI badge | `📍 Live location` | `🧪 Demo / Simulated location` |
| Alert source | same Alert feed, from real transitions | same feed, `simulated` marker set |
| Emergency call | real `tel:` link (device dialer) | — |
| Alarm | sets in-app state (no real remote audio — see Limitations) | — |

**Never presented as medical truth:** the risk posture is a *location heuristic*;
the UI says "unrecognised location", **never "lost"**, and never diagnoses. A
transition only **raises posture** for the caregiver to look; **Search Mode** is
the caregiver's explicit escalation.

---

## 6. Tested flows (all verified by type-check + production build)

1. **At home** → `🟢 safe`, elder marker inside the home geofence.
2. **Leave home** → `🟡 attention`, debounced "left home safe zone" alert with
   distance from home.
3. **Unknown location** → posture elevates (attn, escalating toward unusual);
   critical alert copy uses coordinates/name, not "lost".
4. **Return home / safe place** → `🟢 safe`, calm "returned home" info alert.
5. **Search Mode** → forces `🔴 high` + critical alert; off → re-evaluates.
6. **Alarm** → caregiver triggers; elder `/safety` shows the full-screen overlay;
   "OK, I'm here" resolves it.
7. **Online vs offline** → Leaflet map when online, SVG schematic when offline/
   offline-simulated, each rendering the same geo data.
8. **i18n** — all new UI strings resolve in English, Hindi, Gujarati.
9. **Persistence** — v1 → v2 state migration merges guardian defaults (no data loss).

---

## 7. Known limitations (honest)

- **Risk timing:** an "unknown" fix shows `attention` immediately; `unusual` only
  after the 20-minute lingering threshold (engine uses wall-clock). For a lively
  demo use **Search Mode** (→ 🔴 high) as the primary escalation, which is
  intentional and responsible.
- **Remote alarm audio is limited on the web** — the alarm is in-app state on the
  caregiver side; real on-device ringing/push needs a phone app (out of prototype
  scope). The elder overlay UI demonstrates the interaction.
- **Bundle size** ~1.1 MB (Leaflet + recharts + app). Could be code-split via
  dynamic `import()` of `MapView`; left monolithic for simplicity.
- **Leaflet tiles** come from a public OSM CDN; no key, rate-limited, and only
  load with an internet connection (fallback covers offline).
- **Accompanying-model note:** the risk engine is purely rule-based on location;
  it does **not** model cognition or diagnose.

---

## 8. Final review checklist

- `npx tsc -b` — ✅ no errors.
- `npm run build` — ✅ built in ~8s, chunk-size warning only.
- `npm run dev` — recommended to eyeball the two new routes + demo step 13.