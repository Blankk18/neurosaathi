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
