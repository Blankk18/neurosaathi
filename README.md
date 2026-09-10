# 🧠 NeuroSaathi

### AI-Assisted Cognitive Companion for Elderly Users

NeuroSaathi is a privacy-first, accessibility-focused web application designed to support elderly users through cognitive activities, familiar memories, voice interaction, reminders, and caregiver insights.

The platform combines adaptive cognitive games with a caregiver dashboard to help encourage engagement and provide supportive activity trends — without making medical or diagnostic claims.

> **Smart India Hackathon 2026 · Problem Statement 26003**

---

## ✨ Why NeuroSaathi?

Many elderly users, especially those experiencing memory-related difficulties, can benefit from simple, familiar, and engaging digital experiences.

NeuroSaathi focuses on making technology:

- 🧓 **Simple** — large buttons, clear language, and low-complexity navigation
- 🎤 **Voice-friendly** — interact using speech when supported
- 🧠 **Adaptive** — activity difficulty changes based on recent performance
- 🏡 **Culturally familiar** — activities use familiar objects, routines, and regional contexts
- 🔒 **Privacy-first** — prototype data remains on the user's device
- 📴 **Offline-capable** — core activities continue working without an internet connection
- 👨‍👩‍👧 **Caregiver-connected** — caregivers can view activity trends and supportive indicators

---

## 🎮 Cognitive Activities

NeuroSaathi currently includes these activity types:

| Activity | Purpose |
|---|---|
| 👨‍👩‍👧 Family Memory Challenge | A premium "remember together" journey: photos of people, places and moments with gentle questions, hints, confidence and spaced reinforcement |
| 🧠 Memory Match | Match familiar objects and build memory engagement |
| 🧩 Pattern Game | Identify patterns and exercise attention |
| 🕰️ Routine Recall | Remember familiar daily routines |
| 🏡 Region Memories | Use culturally familiar regional objects and scenes |

Each completed session records:

- Accuracy
- Response time
- Mistakes
- Attempts
- Difficulty level
- Next recommended difficulty

---

## 🛡️ NEUROSAATHI GUARDIAN — Location Safety (SIH 2026 Showcase)

Guardian is the live-location safety layer: the caregiver can see **where the elder
is**, configure a **home geofence** plus **familiar safe places**, watch a **movement
trail**, and get **risk-posture alerts** — with a **demo location simulator** so
judges can exercise the whole flow without physically moving a device.

**Responsible by design** — Guardian is a *location* heuristic for caregiver
awareness. It **never says "lost" and never diagnoses**; an unrecognised location
only raises the posture so a caregiver can look, and **Search Mode** is the
caregiver's explicit escalation to alert helpers.

### Caregiver location dashboard (`/caregiver/location`)
- Live risk banner (🟢 safe · 🟡 attention · 🟠 unusual · 🔴 high / search mode)
- **Hybrid map**: real Leaflet + OpenStreetMap when online, an on-brand offline
  SVG schematic when there is no network (labelled "Offline map")
- Elder marker, home & safe-place geofences, movement trail, accuracy radius
- Elder snapshot: last-update age, accuracy, distance from home, nearest place
- **Demo simulator** (simulated moves for judges): Home, Leave, Temple, Hospital,
  Grocery, Unknown — each fixing the elder's position and updating the risk ladder
- Live GPS mode via `navigator.geolocation` (permission-gated, with a clear
  denied-state flow)
- Home geofence config, safe-place manager, emergency contacts (with `tel:` call)
- **Search Mode** toggle (forces 🔴 high) and **on-device alarm** trigger

### Elder safety view (`/safety`)
- Reassuring, plain-language status ("You're safe") tuned by risk posture
- One giant **"Call caregiver"** button (rings the first emergency contact)
- On-device **alarm overlay** when the caregiver triggers an alarm, with a calm
  "OK, I'm here" response

Guardian alerts reuse the app's existing `Alert` feed and are **debounced** so a
transition never spams. Simulated fixes are **always** labelled
`Demo / Simulated location` — never posed as real GPS.

> Demo tip: open `/demo` → step 13 (Location safety) to try the simulator inline,
> or use the sim buttons on `/caregiver/location`.

---

## 🤖 Adaptive Difficulty Engine

NeuroSaathi uses a rule-based adaptive engine in the current prototype.

Instead of changing difficulty from a single result, the engine evaluates a short window of recent sessions.

### Adaptation logic

```text
Recent performance
       ↓
Accuracy + response time + mistakes
       ↓
Adaptive engine
       ↓
┌───────────────┬───────────────┬───────────────┐
│ High & stable │   Moderate    │    Declining  │
│               │               │               │
│ Increase      │ Maintain      │ Decrease      │
│ difficulty    │ difficulty    │ difficulty    │
└───────────────┴───────────────┴───────────────┘

---

## 👨‍👩‍👧 Family Memory Challenge

The family activity was rebuilt into a warm, premium **memory journey** (replacing the old
"Remember the Scene" quiz experience on the patient-facing side):

- **Own a journey, not a quiz** — observe a photo → answer a gentle question → supportive
  feedback → reveal the memory → next. No countdown, no "wrong/failure" language.
- **9 question types** — who, relationship, where, when (approximate), event, who-was-with-you,
  plus *visual-location* (🏠/🏫/🌳/🛕 cards), *memory sequence* (what happened first) and
  *then-vs-now*.
- **Interesting, believable demo memories** — a single fictional family's life story (1990–2022)
  across childhood, festivals, birthdays, school, travel, weddings, home, friends and places.
  Each photo is a locally generated SVG data-URI (no image API, no text overlays, fully offline).
- **4-level progressive hints** and optional **confidence** ("How sure are you?"), both recorded.
- **Spaced reinforcement** — weak memories (wrong or unsure) are offered again via a
  "Practice These Memories" action, labelled as a memory journey, never as treatment.
- Reuses the existing adaptive engine + `useGameSession('family-memory')`; every session reports
  accuracy, response time, mistakes, hints and confidence to the caregiver dashboard.
- A **"How it works"** intro, tap-to-enlarge photos, optional voice read-aloud, a shared i18n
  dictionary (English / Hindi / Gujarati), and elderly-friendly accessibility (large type &
  buttons, keyboard & screen-reader friendly, no colour-only meaning).
