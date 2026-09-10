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

NeuroSaathi currently includes six activity types:

| Activity | Purpose |
|---|---|
| 🧠 Memory Match | Match familiar objects and build memory engagement |
| 🖼️ Scene Memory | Observe a scene and recall its details |
| 🧩 Pattern Game | Identify patterns and exercise attention |
| 🕰️ Routine Recall | Remember familiar daily routines |
| 👨‍👩‍👧 Family Memories | Recall information about family members |
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
