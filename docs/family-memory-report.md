# NEUROSAATHI FAMILY MEMORY CHALLENGE — Change & Handover Report

**Goal:** Replace the patient-facing "Remember the Scene" quiz with a premium
**Family Memory Challenge** ("Remember the people, places and moments that
matter.") — a warm, calm, elderly-friendly **memory journey** rather than a test.

The work **extends the existing `FamilyMemoryGame`** in place (it keeps its
filename, route `/games/family` and `useGameSession('family-memory')`). No new
rules framework, no duplicated architecture, no random new UI. **Scene Memory**
was removed only from the patient-facing surface; its `'scene-memory'` member of
the `GameKind` union is kept for legacy persisted-data/dashboard compatibility.

---

## 1. What was built

- **Premium intro screen** — "Family Memories · Family Memory Challenge", warm
  "Let's remember together" copy, `Personalized` / `Adaptive` badges, a huge
  **"Start Memory Journey"** primary button plus a **"How it works"** accordion.
- **A memory journey, not a quiz** — observe photo → gentle question → supportive
  feedback → reveal context → next memory. A calm `Memory n of m` pill with a
  hearts-style progress bar. **No countdown**, response time is tracked silently.
- **9 question types** — `who`, `relationship`, `where`, `when` (approximate
  years), `event`, `companion`, plus advanced `visual-location` (🏠/🏫/🌳/🛕 icon
  cards), `sequence` (what happened first) and `then-now` (younger vs today).
- **A believable demo album** — one consistent fictional family's life story
  (≈1990–2022) across all 10 categories. Each photo is a **locally generated SVG
  data-URI** (warm sepia "old family photo" style, **no text overlays**, fully
  offline, no AI image-gen API).
- **4-level progressive hints** — relationship clue → context clue → visual clue →
  reveal. Hint use is recorded but never punished.
- **Optional confidence** — 😊 Very sure / 🙂 Somewhat sure / 🤔 Not sure yet —
  stored as session data, skippable.
- **Memory reinforcement** — weak memories (wrong option **or** unsure) get a
  gentle "Let's remember this together ❤️" card and are offered again under
  **"Practice These Memories"** on the result screen. Labelled as a memory
  journey — never a medical or cognitive treatment.
- **Photo viewer** — large hero image, rounded frame, soft shadow, responsive,
  and a **tap-to-enlarge** modal.
- **Reuses the adaptive engine + `useGameSession`** — accuracy, average response
  time, mistakes, attempts, and level all flow through the same scoring and
  adaptation path as every other game; hints & confidence are additionally
  reported. Difficulty 1–5 map to way-way-rounded round shapes in
  `FAMILY_DIFFICULTY_CONFIG`.
- **Result screen** — "Memory Journey Complete ❤️", journey stats (Memories
  explored / Remembered / Used clues / To revisit / Avg time / Confidence),
  next recommended difficulty, and buttons: **Play Again**, **Practice These
  Memories**, **Review Memories**, **Return to Activities** — alongside the
  reused `GameResultScreen` metric ring and adaptation note.
- **Voice (optional, respects `voiceOn`)** — speaks "Take a moment…" and the
  question, in the current language (English / Hindi / Gujarati) via the existing
  TTS + `speakText`.
- **Accessibility** — large type & buttons, keyboard/screen-reader friendly
  labels, reduced-motion-safe `fade-up` animations, and **no colour-only meaning**
  (options carry icon + text + colour).

---

## 2. Files changed

### New files
| File | Purpose |
|---|---|
| `src/data/familyMemoryDemo.ts` | 12 demo memories + SVG scene generator (figures, houses, trees, lamps, cakes, etc.) → data-URI images. Typed `DemoFamilyMemory`, helpers `demoMemoryById` / `demoMemoriesForDifficulty`. |
| `src/engine/familyMemory.ts` | Pure question/hint/confidence/reinforcement engine. `QuestionKind`, `MemoryQuestion`, `FAMILY_DIFFICULTY_CONFIG`, `buildMemoryQuestions`, `ruleBasedGenerator` (swappable interface for a future AI generator), `nextReinforcementQueue`, `CONFIDENCE_META`. |
| `docs/family-memory-report.md` | This report. |

### Modified files
| File | Change |
|---|---|
| `src/types.ts` | Added `MemoryCategory` union; extended `FamilyMemory` with optional rich fields: `people`, `relationships`, `place`, `year`, `event`, `description`, `category`, `difficulty`, `tags`. |
| `src/pages/patient/games/FamilyMemoryGame.tsx` | **Rewritten** into the flagship journey (intro → observe → question → feedback → reveal → result), reusing `useGameSession` + `GameResultScreen` + adaptive engine. |
| `src/pages/patient/GamesHub.tsx` | **Scene Memory card removed**; **Family Memory Challenge is now the flagship**, full-width, warm-gradient, with subtitle + `Personalized` / `Adaptive` badges. `GAME_ICONS`/`GAMES` keep a legacy `scene-memory` entry for type-compat (no card renders it). |
| `src/i18n/en.ts`, `src/i18n/hi.ts`, `src/i18n/gu.ts` | ~80 new challenge keys each (intro, journey, hints, confidence, feedback, reinforcement, reveal, result, a11y labels) in English, Hindi, Gujarati. |
| `src/App.tsx` | Removed `SceneMemory` import + `/games/scene` route. |
| `src/components/layouts.tsx` | Removed `/games/scene` from patient page-speech. |
| `src/pages/patient/PatientHome.tsx` | Removed the Scene Memory activity card (Family Memory now listed first); `GAME_ROUTE` keeps a legacy `scene-memory` entry for the exhaustive `Record<GameKind,…>` type. |
| `src/pages/patient/VoiceChat.tsx` | Removed the Scene Memory shortcut; kept a legacy type-compat entry. |
| `README.md` | Replaced the Scene Memory row in the activity table; added a Family Memory Challenge showcase section. |

### Removed files
| File | Reason |
|---|---|
| `src/pages/patient/games/SceneMemory.tsx` | Superseded by the Family Memory Challenge. Route + import removed. |

---

## 3. New dependencies

**None.** The challenge uses local SVG data-URIs and the existing engine, storage,
voice and i18n layers.

---

## 4. Environment & run

- `npm install` → `npm run dev`.
- The Family Memory Challenge needs **no photo upload** — it ships with the demo
  album and plays immediately.

Test flow (patient):
```
/games  → tap the FleetMemory Challenge flagship → intro
  → "Start Memory Journey" → observe a photo ("I'm ready")
  → answer a gentle question (icons + text + colour options)
  → optional 💡 hint and "How sure are you?" 😊🙂🤔
  → supportive feedback → reveal the memory (year, place, people, category) → next
  → result: "Memory Journey Complete ❤️" with journey stats + Play Again /
    Practice These Memories / Review Memories / Return to Activities
  → Practice These Memories re-asks the weak memories from a different angle
```
Scenes Memory is no longer listed on the hub/home/voice; the legacy `scene-memory`
identification is retained in stored data and dashboards so past records still read.

---

## 5. Demo vs real — honest labelling

| Layer | Real | Demo / placeholder |
|---|---|---|
| Photos | Real family photographs a caregiver adds (future) | Locally generated SVG data-URIs (2026 fictional family life story) |
| Question content | Derived from the added memory's metadata | Derived from `DemoFamilyMemory` metadata |
| Labelling | — | Intro + result show a **demo/consent note** |
| Adaptive engine / scoring / voice / i18n | Same code path as every game | — |

**Never a diagnosis** — the game and result screen both state this is a gentle
memory journey for engagement, not a test or treatment.

---

## 6. Verified

- `npx tsc -b` — ✅ no errors.
- `npm run build` — ✅ builds (only the pre-existing large-chunk warning).
- Confirm no remaining references to `SceneMemory`; `/games/scene` is gone from
  App routes.

---

## 7. Known limitations

- **Demo questions are rule-based** (good/bad distractors are hand-curated small
  pools). `ruleBasedGenerator` conforms to a `QuestionGenerator` interface so a
  future LLM generator can replace it without touching the game screen.
- **Reinforcement is lightweight** — weak memories are re-asked once more, now,
  via "Practice These Memories"; a full spaced-repetition scheduler is a future
  enhancement (engine exposes `nextReinforcementQueue` for that).
- **Real-album merge** — the challenge currently sources from the demo dataset
  for a consistent story; the `FamilyMemory` type now supports the rich fields a
  caregiver-added album would use, but wiring real albums into the journey is a
  follow-up.
- **Bundle size** unchanged concern from the existing app (recharts/leaflet).

---

## 8. Final review checklist

- `npx tsc -b` — ✅
- `npm run build` — ✅
- `npm run dev` — recommended to eyeball `/games` (flagship card) and `/games/family`
  (full journey in English, Hindi and Gujarati).