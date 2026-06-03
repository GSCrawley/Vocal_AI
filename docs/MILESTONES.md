# VOICE Project Milestones

> Sequencing principle (adopted 2026-05-29): **singing-first**. VOICE is built as a Singing Tier coach first, then extended into a Speaking Tier in Phase 2 by leveraging the singing-tier audio analysis stack.
>
> Checklist convention for agent execution:
>
> - Parent milestone-step checkboxes represent whether the step is fully complete.
> - Child checkboxes record implementation reality in the repo.
> - If a parent step is unchecked but some child items are checked, that step is **in progress** and Jules should build on existing work rather than recreate it.
> - This file is a delivery guide, not a product-marketing roadmap. It should reflect what is actually implemented in the repository.

## Build 0.1 — Sustained-Note Proof of Concept (Singing)

**Goal:** prove one narrow vocal training loop — sustained note / pitch — end to end.

**Status:** foundational package work is implemented and tested. Build 0.1 is partially implemented across shared packages and some backend scaffolding, but the actual end-to-end mobile sustained-note loop is not yet complete.

### Step 1 — Foundations

- [x] Build 0.1 foundations complete
  - [x] `packages/audio-metrics` scoring functions implemented
  - [x] `packages/audio-metrics` tests present
  - [x] `packages/exercise-engine` session state machine and attempt lifecycle implemented
  - [x] `packages/exercise-engine` tests present
  - [x] Microphone permission flow implemented in mobile

### Step 2 — Attempt analysis loop

- [ ] Build 0.1 attempt analysis loop complete
  - [x] Package-level mic check logic implemented (`packages/audio-metrics`)
  - [x] Package-level sustained-note scoring implemented (`packages/audio-metrics`)
  - [x] Package-level onset scoring implemented (`packages/audio-metrics`)
  - [x] Session-state transitions for attempt/analyze/review flow implemented (`packages/exercise-engine`)
  - [x] Placeholder API audio scoring route exists (`services/api`)
  - [ ] Mic check flow implemented in the mobile app
  - [ ] Sustained-note exercise execution implemented in the mobile app
  - [ ] Live pitch guidance / feedback implemented in the mobile app
  - [ ] Post-exercise score and coaching display implemented in the mobile app

### Step 3 — Best-take, reflection, and reward loop

- [ ] Build 0.1 session-close loop complete
  - [x] `BestTake` contract exists in shared types
  - [x] `Reflection` contract exists in shared types
  - [x] Analytics event names for mic check / best take / reflection exist in shared types
  - [x] XP computation logic exists in `packages/reward-engine`
  - [ ] Best-take save flow implemented
  - [ ] Best-take replay flow implemented
  - [ ] Reflection prompts implemented in the app
  - [ ] XP / reward summary implemented after reflection
  - [ ] Core Build 0.1 analytics events actually recorded end to end

## Build 0.2 — Audio Analysis Depth (Singing)

**Goal:** give the avatar a "good ear" — live pitch tracking that actually works in moderate-noise conditions, plus server-side deep analysis that produces voice-quality signals usable for real coaching feedback.

Full task breakdown lives in `docs/build-0.2-audio-analysis.md`. Architecture in `docs/architecture/avatar-and-audio-analysis.md`.

**Status:** this build has already started. There is meaningful mobile dependency setup plus substantial Python audio-processor groundwork in the repo, but the accepted Build 0.2 end-to-end path is not yet complete.

### Step 1 — Client-side live pitch path

- [ ] Build 0.2 client-side live pitch path complete
  - [x] `pitchy` dependency added to `apps/mobile`
  - [ ] Audio capture pipeline wired for live frame processing in the mobile app
  - [ ] Live pitch visualization rendered in the sustained-note exercise screen
  - [ ] Mobile app feeds live pitch frames into the existing `packages/audio-metrics` path
  - [ ] Latency validated at or below the Build 0.2 target budget

### Step 2 — Server-side Python audio analysis path

- [ ] Build 0.2 server-side Python audio analysis path complete
  - [x] Python audio-processor scaffold exists
  - [x] FastAPI entrypoint exists in `services/audio-processor/python`
  - [x] Python Dockerfile exists
  - [x] `librosa` dependency present
  - [x] pYIN-based pitch extraction code exists
  - [x] Supporting pitch-frame conversion code exists
  - [ ] `POST /analyze` endpoint implemented for the accepted Build 0.2 attempt-analysis path
  - [ ] Refined pitch, onset, RMS, and basic vibrato returned through the accepted Build 0.2 response shape
  - [ ] Deterministic test fixture for the Build 0.2 analysis pipeline added
  - [ ] `/healthz` matches the intended deployed signature for this build

### Step 3 — Shared contract and API integration

- [ ] Build 0.2 shared contract and API integration complete
  - [ ] `DeepAnalysisResult` added to `@voice/shared-types`
  - [ ] Audio-analysis job/result contracts finalized in shared types for the Build 0.2 path
  - [ ] API route uploads attempt audio for Build 0.2 analysis
  - [ ] API persists returned deep analysis against attempts
  - [ ] API returns enriched coaching payload inline with attempt completion

### Step 4 — Coaching integration and consent

- [ ] Build 0.2 coaching integration and consent complete
  - [ ] `packages/coaching-rules` consumes deep analysis
  - [ ] One-correction invariant preserved on enriched coaching paths
  - [ ] Audio storage consent flow added
  - [ ] Audio storage default remains off
  - [ ] Mobile app falls back cleanly to live-only scoring when consent is not granted

### Step 5 — Avatar voice provider scaffold

- [ ] Build 0.2 avatar voice provider scaffold complete
  - [ ] `AvatarVoiceProvider` interface added
  - [ ] At least one provider adapter implemented
  - [ ] Layer 3 evaluation notes documented in architecture docs

## Build 0.2.1 — Voice Quality Extensions (Singing)

**Goal:** add parselmouth (Praat bindings) to the Python audio-processor for jitter, shimmer, formants, and harmonics-to-noise ratio.

Staged separately from Build 0.2 because parselmouth carries a meaningful cold-start cost on Render's Starter plan and we want the librosa pipeline proven before doubling the dependency surface.

**Status:** this build also has real groundwork in the repo already, but not milestone completion.

### Step 1 — Dependency and analysis groundwork

- [ ] Build 0.2.1 dependency and analysis groundwork complete
  - [x] Parselmouth added to Python dependencies
  - [x] Formant-analysis code exists in the Python audio-processor
  - [x] Singing-metrics job code returns fields for jitter, shimmer, and HNR-related outputs
  - [ ] Jitter extraction verified in the accepted production path
  - [ ] Shimmer extraction verified in the accepted production path
  - [ ] HNR extraction verified in the accepted production path
  - [ ] Voice-quality outputs validated against the final shared contract

### Step 2 — Contract and coaching integration

- [ ] Build 0.2.1 contract and coaching integration complete
  - [ ] Voice-quality signals surfaced through `DeepAnalysisResult`
  - [ ] Coaching templates updated to use voice-quality signals
  - [ ] One-correction invariant preserved on those paths

### Step 3 — Deployment validation

- [ ] Build 0.2.1 deployment validation complete
  - [ ] Render plan reviewed against cold-start budget
  - [ ] Upgrade from Starter made if health-check budget requires it

## Build 0.3 — Singing Tier MVP

**Goal:** a complete, polished Singing Tier vocal coaching loop ready for real users.

**Status:** there is already meaningful groundwork in shared contracts, avatar logic, reward logic, and audio-processor baseline-analysis code, but the Build 0.3 user-facing MVP is not yet complete.

### Step 1 — Content and onboarding

- [ ] Build 0.3 content and onboarding complete
  - [ ] Curriculum library includes at least 10 sustained-note and pitch-pattern exercises
  - [ ] Onboarding with goal selection implemented
  - [ ] Baseline assessment flow implemented end to end

### Step 2 — Session experience

- [ ] Build 0.3 session experience complete
  - [ ] Daily session structure implemented (warm-up + core + reflection)
  - [x] `packages/avatar-state` contains meaningful state and dialogue logic
  - [ ] Avatar coach fully wired into the session flow
  - [ ] Avatar behavioral states implemented on actual product paths

### Step 3 — Progress loop

- [ ] Build 0.3 progress loop complete
  - [x] Reward/XP package scaffold exists
  - [x] Shared reward and progress contracts exist
  - [ ] XP tracking implemented end to end
  - [ ] Streak tracking implemented end to end
  - [ ] Personal-best tracking implemented end to end
  - [ ] User-facing progress surfaces implemented

### Step 4 — Voice output decision and wiring

- [ ] Build 0.3 voice output complete
  - [ ] TTS provider evaluation completed
  - [ ] One provider selected based on side-by-side testing
  - [ ] Avatar voice wired into the live coaching path

## Build 1.0 — Singing Tier Production

**Goal:** Singing Tier shipped and stable. The product exists as a credible singing coach in the market.

### Step 1 — Quality and safety hardening

- [ ] Build 1.0 quality and safety hardening complete
  - [ ] All Build 0.3 features hardened with QA coverage
  - [ ] Privacy, consent, and data-retention flows audited end to end
  - [ ] Avatar dialogue passes copy-lint and one-correction invariants on all paths

### Step 2 — Reliability and release readiness

- [ ] Build 1.0 reliability and release readiness complete
  - [ ] Performance budgets met on a documented range of devices
  - [ ] Crash-free session rate above target
  - [ ] Sentry, analytics, and notification pipelines stable
  - [ ] App-store-ready builds produced

## Phase 2 — Speaking Tier (Leveraging Singing Infrastructure)

**Goal:** extend VOICE to coach speaking skills, reusing as much of the singing-tier audio infrastructure as possible.

See `docs/phase-2-speaking-tier.md` for the full plan.

### Step 1 — Core speaking analysis

- [ ] Phase 2 core speaking analysis complete
  - [x] `packages/speaking-metrics` package exists
  - [ ] Speaking-specific overlays on the existing pitch/RMS/voiced-frame infrastructure completed
  - [ ] WPM and pace target system completed
  - [ ] Filler word detection completed
  - [ ] Prosody variability scoring completed

### Step 2 — Speaking product layer

- [ ] Phase 2 speaking product layer complete
  - [ ] Specialization tracks (presentation, podcast, interview)
  - [ ] Speaking tier curriculum

## Phase 3 — Karaoke and Style

**Goal:** advanced singing functionality with licensed song processing and stylistic specialization.

**Status:** the repo already contains substantial karaoke-oriented groundwork, but this phase is not product-complete and remains gated by sequencing and licensing.

### Step 1 — Karaoke core

- [ ] Phase 3 karaoke core complete
  - [x] `packages/karaoke-engine` package exists
  - [x] Audio-processor code exists for DTW-style comparison and vocal-analysis jobs
  - [ ] Karaoke Mode (Singing Tier) implemented end to end
  - [ ] Demucs / DTW / snippet flow integrated into actual product paths
  - [ ] Music licensing path resolved

### Step 2 — Advanced singing product features

- [ ] Phase 3 advanced singing product features complete
  - [ ] Style packs for Singing Tier
  - [ ] SOVT warm-up exercises
  - [ ] Adaptive difficulty
  - [ ] Push notifications with personalized prompts

## Phase 4 — Community and Coaching Tier

**Goal:** extended content and social features.

### Step 1 — Community layer

- [ ] Phase 4 community layer complete
  - [ ] Community features implemented

### Step 2 — Extended coaching and specialization

- [ ] Phase 4 extended coaching and specialization complete
  - [ ] Optional live coaching tier
  - [ ] Cross-tier specialization tracks
  - [ ] Advanced speaking specializations (TED, podcast, interview), if Phase 2 priorities support

## Notes on Sequencing

The singing-first sequencing has been adopted because:

1. The singing tier is the harder audio problem and subsumes most of the speaking tier's analytical needs. Building it first means the speaking tier is largely a thin overlay rather than a parallel system.
2. The codebase has been implicitly singing-first since PR #87. Formalizing the sequence eliminates the "does this serve both tiers?" tax on every decision.
3. The product is most differentiated as a singing coach; speaking-tier apps are a crowded market.

This is a sequencing decision, not a vision change. The Speaking Tier is preserved as Phase 2, the `packages/speaking-metrics` work is parked (not deleted) and will be picked back up when Phase 2 begins.

## Repo-Reality Notes

- A package or service existing in the monorepo does **not** mean the associated milestone is complete.
- This file should track what is actually implemented in the repository so execution agents can build on existing work.
- Parent milestone steps should remain unchecked until the full step is complete.
- Child items should be checked whenever concrete repo work already exists, even if the user-facing flow is not finished.
- When this file and a lower-level implementation checklist disagree, update whichever one is stale so Jules is never guided by known-inaccurate status.
