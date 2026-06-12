# VOICE

VOICE is a mobile-first vocal training platform with two distinct learning tiers:

- **Speaking Tier** — for public speakers, podcasters, teachers, social media creators, and anyone who wants a more commanding, confident, or expressive voice.
- **Singing Tier** — for singers at every level who want to expand range, improve pitch, master different styles, and train using real songs.

Both tiers (with Singing Tier prioritized as Phase 1, and Speaking Tier as Phase 2) are powered by an AI avatar coach that adapts to each user's current skill level, guides them through structured exercises with real-time audio feedback, and uses evidence-based coaching techniques to build lasting vocal skill — not just session-by-session scores.

---

## Product highlights

- **Real-time audio analysis** — live pitch, pace, stability, resonance, and dynamics feedback while the user performs
- **AI avatar coach** — an animated character that coaches, encourages, and adapts its approach to the user's tier, goal, and progress
- **Educational karaoke** (Singing Tier) — users practice songs snippet by snippet; the AI removes vocal tracks, analyzes the original, and coaches the user toward matching it
- **Dual-tier curriculum** — structured lesson progressions for both Speaking and Singing, from foundational exercises through advanced style work
- **Reward system** — XP, streaks, achievement badges, and unlockable content (style packs, avatar customizations) grounded in Self-Determination Theory
- **Best-take replay** — the user's best recorded attempt is saved and played back so they can hear themselves succeeding

---

## Repository layout

```
apps/
  mobile/          # Cross-platform Expo (React Native) user app
  admin/           # Internal content and operations tooling

services/
  api/             # Main backend API (Node.js)
  audio-processor/ # Audio analysis worker (pitch detection, vocal separation)
  analytics-worker/ # Background aggregations and progress summaries
  notification-worker/ # Reminder and streak notification orchestration

packages/
  shared-types/    # All shared domain contracts — tiers, goals, exercises, metrics, rewards
  exercise-engine/ # Session and exercise orchestration logic (tier-aware)
  coaching-rules/  # Score-to-feedback mapping for both tiers
  audio-metrics/   # Singing metric contracts, score helpers, pitch analysis
  speaking-metrics/ # Speaking-specific metric contracts (pace, prosody, filler words, resonance)
  curriculum/      # Structured lesson plans and progressions for both tiers
  content-schema/  # Versioned schema contracts for exercises and plans
  karaoke-engine/  # Karaoke mode orchestration: snippet selection, comparison, coaching
  reward-engine/   # XP, streaks, badges, skill trees, unlock logic
  avatar-state/    # Avatar behavioral state machine and dialogue system
  ui-tokens/       # Shared design tokens (colors, typography, spacing)

docs/
  architecture/    # System design notes
  product/         # Product specs, tier designs, feature blueprints
  api/             # API documentation
  qa/              # QA matrices and test plans
```

---

## Coaching philosophy

VOICE is built on a core insight from learning science: **the real value is not "AI analyzes your voice" — it is helping a person build accurate self-hearing, self-trust, and repeatable practice habits that turn isolated good moments into stable vocal skill.**

The AI coach is designed to:

- Create psychological safety and a sense of progress every session
- Give one clear, actionable correction at a time — never a dashboard of failures
- Manufacture "good take moments" that the user can hear and own
- Build internal cues (how it feels) alongside external feedback (what the meter shows)
- Protect the voice and the psyche — simplifying rather than shaming when confidence is low

See `docs/product/product-vision.md` and `docs/product/coaching-philosophy.md` for the full specification.

---

## Build targets

### Build 0.1 — Singing (Singing Tier proof of concept)

Prove one narrow singing coaching loop (the Sustained Note primary Trust Signal):

1. Mic permission
2. Mic check
3. Sustained-note exercise
4. Live pitch guidance
5. Post-exercise score
6. Best-take save and replay

### Build 0.2 — Audio Analysis Depth (Singing)

Prove live pitch tracking and server-side deep analysis (voice quality, etc.) for singing.

### MVP

Singing Tier operational with goal selection, baseline assessment, daily sessions, progress tracking, avatar coaching, and a reward loop.

### Phase 2 — Speaking Tier

Extend VOICE to coach speaking skills, leveraging the singing-tier audio infrastructure.

Both tiers operational with goal selection, daily sessions, progress tracking, avatar coaching, and a reward loop.

### Phase 3 — Karaoke Mode and Style Packs

Educational karaoke: song selection, vocal separation, snippet practice, AI comparison and coaching.

### Phase 4 — Community and Coaching Tier

Advanced singing styles (jazz, opera, blues, heavy metal, grindcore), speaking specializations (TED, podcast, interview), and optional coaching tier.

---

## Tech stack summary

| Layer             | Choice                                                        |
| ----------------- | ------------------------------------------------------------- |
| Mobile app        | Expo (React Native)                                           |
| Language          | TypeScript throughout                                         |
| Audio (mobile)    | expo-av + react-native-audio-api                              |
| Pitch detection   | YIN / pYIN (JS/WASM implementation)                           |
| Speaking analysis | Praat-derived algorithms + on-device ASR for filler detection |
| Vocal separation  | Demucs (server-side, GPU-accelerated)                         |
| State management  | Zustand                                                       |
| Backend           | Node.js (monorepo service)                                    |
| Database          | Supabase (PostgreSQL + Auth + Storage)                        |
| Avatar rendering  | Lottie / React Native Skia                                    |
| Package manager   | pnpm (workspaces)                                             |

See `docs/architecture/technical-stack.md` for full rationale.
