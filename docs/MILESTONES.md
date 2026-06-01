# VOICE Project Milestones

> Sequencing principle (adopted 2026-05-29): **singing-first**. VOICE is built as a Singing Tier coach first, then extended into a Speaking Tier in Phase 2 by leveraging the singing-tier audio analysis infrastructure. The prior dual-tier framing has been superseded. See `docs/architecture/avatar-and-audio-analysis.md` for the architectural rationale and `docs/phase-2-speaking-tier.md` for the parked Speaking Tier roadmap.

## Build 0.1 — Sustained-Note Proof of Concept (Singing)

**Goal:** prove one narrow vocal training loop — sustained note / pitch — end to end.

**Status:** package-layer foundations landed in PR #87 (`packages/audio-metrics` and `packages/exercise-engine` are implemented and tested). Mobile app integration, mic-check UX, best-take, reflection, and reward sequencing remain.

- [x] `packages/audio-metrics` scoring functions (Hz-to-cents, evaluateFrame, micCheck, scorePitchAccuracy, scoreStability, scoreOnset, scoreSustainedNote)
- [x] `packages/exercise-engine` session state machine and attempt lifecycle
- [x] Microphone permission flow (mobile)
- [ ] Mic check flow (signal presence / quality detection) in-app
- [ ] Sustained-note exercise execution in-app
- [ ] Live pitch guidance / feedback during exercise (basic, may use stub pitch source until Build 0.2 wires pitchy)
- [ ] Post-exercise score calculation and display
- [ ] Best-take save and replay functionality
- [ ] Reflection prompts before reward summary
- [ ] XP / reward summary after reflection
- [ ] Core Build 0.1 events recorded

## Build 0.2 — Audio Analysis Depth (Singing)

**Goal:** give the avatar a "good ear" — live pitch tracking that actually works in moderate-noise conditions, plus server-side deep analysis that produces voice-quality signals usable for real coaching feedback.

Full task breakdown lives in `docs/build-0.2-audio-analysis.md`. Architecture in `docs/architecture/avatar-and-audio-analysis.md`.

- [ ] Layer 1: pitchy on the mobile client, sub-80ms live feedback latency
- [ ] Layer 2 (Stage 1): librosa on the Python audio-processor — refined pitch, onset, RMS, basic vibrato
- [ ] `DeepAnalysisResult` contract in `@voice/shared-types`
- [ ] API integration: upload, analyze, persist, return enriched coaching
- [ ] Coaching-rules consumes deep analysis (one-correction invariant preserved)
- [ ] Audio storage consent flow, default off
- [ ] `AvatarVoiceProvider` interface and at least one provider adapter (Deepgram Aura-2 first candidate)

## Build 0.2.1 — Voice Quality Extensions (Singing)

**Goal:** add parselmouth (Praat bindings) to the Python audio-processor for jitter, shimmer, formants, and harmonics-to-noise ratio.

Staged separately from Build 0.2 because parselmouth carries a meaningful cold-start cost on Render's Starter plan and we want the librosa pipeline proven before doubling the dependency surface.

- [ ] Parselmouth added to `services/audio-processor` Python dependencies
- [ ] Jitter and shimmer extracted and surfaced through `DeepAnalysisResult`
- [ ] Formant extraction for vowel-shaping feedback
- [ ] Render plan reviewed — upgrade from Starter if cold-start exceeds the deployment health check budget
- [ ] Coaching templates updated to use voice-quality signals (still one correction per attempt)

## Build 0.3 — Singing Tier MVP

**Goal:** a complete, polished Singing Tier vocal coaching loop ready for real users.

- [ ] Curriculum library: at least 10 sustained-note and pitch-pattern exercises spanning beginner-to-intermediate difficulty
- [ ] Onboarding with goal selection (range exploration, pitch accuracy, vibrato development, etc.)
- [ ] Baseline assessment
- [ ] Daily session structure (warm-up + core + reflection)
- [ ] Avatar coach with all behavioral states implemented (per `packages/avatar-state`)
- [ ] Progress tracking with XP, streaks, and personal-best tracking
- [ ] TTS provider evaluation (Deepgram, ElevenLabs, OpenAI, others) — pick one based on side-by-side user testing
- [ ] Avatar voice wired into the live coaching path

## Build 1.0 — Singing Tier Production

**Goal:** Singing Tier shipped and stable. The product exists as a credible singing coach in the market.

- [ ] All Build 0.3 features hardened with QA coverage
- [ ] Privacy, consent, and data-retention flows audited end-to-end
- [ ] Performance budgets met on a documented range of devices
- [ ] Crash-free session rate above target
- [ ] Avatar dialogue passes copy-lint and one-correction invariants on all paths
- [ ] Sentry, analytics, and notification pipelines stable
- [ ] App-store-ready builds

## Phase 2 — Speaking Tier (Leveraging Singing Infrastructure)

**Goal:** extend VOICE to coach speaking skills, reusing as much of the singing-tier audio infrastructure as possible.

See `docs/phase-2-speaking-tier.md` for the full plan. High-level scope:

- [ ] Speaking-specific overlays on the existing pitch/RMS/voiced-frame infrastructure
- [ ] WPM and pace target system
- [ ] Filler word detection (server-side, leveraging the Whisper integration path from the audio processor)
- [ ] Prosody variability scoring
- [ ] Specialization tracks (presentation, podcast, interview)
- [ ] Speaking tier curriculum

## Phase 3 — Karaoke and Style

**Goal:** advanced singing functionality with licensed song processing and stylistic specialization.

- [ ] Karaoke Mode (Singing Tier) — Demucs, DTW, snippet flow per `packages/karaoke-engine`
- [ ] Style packs for Singing Tier (jazz, opera, metal, etc.)
- [ ] Music licensing path resolved
- [ ] SOVT warm-up exercises
- [ ] Adaptive difficulty
- [ ] Push notifications with personalized prompts

## Phase 4 — Community and Coaching Tier

**Goal:** extended content and social features.

- [ ] Community features (optional: share recordings, compare progress)
- [ ] Optional live coaching tier (connect with human coaches)
- [ ] Cross-tier specialization tracks
- [ ] Advanced speaking specializations (TED, podcast, interview) — if Phase 2 priorities support

## Notes on Sequencing

The singing-first sequencing has been adopted because:

1. The singing tier is the harder audio problem and subsumes most of the speaking tier's analytical needs. Building it first means the speaking tier is largely a thin overlay rather than a parallel system.
2. The codebase has been implicitly singing-first since PR #87. Formalizing the sequence eliminates the "does this serve both tiers?" tax on every decision.
3. The product is most differentiated as a singing coach; speaking-tier apps are a crowded market.

This is a sequencing decision, not a vision change. The Speaking Tier is preserved as Phase 2, the `packages/speaking-metrics` work is parked (not deleted) and will be picked back up when Phase 2 begins. See `docs/phase-2-speaking-tier.md` for details.
