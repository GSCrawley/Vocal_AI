# Build 0.2 — Audio Analysis Depth (Singing Tier)

> Goal: give the avatar a "good ear." Extend the Build 0.1 sustained-note loop with on-device pitch tracking that actually works in moderate-noise environments, and add server-side deep analysis that produces voice-quality signals usable for real coaching feedback.

## Scope Anchors

This build is bounded by `docs/architecture/avatar-and-audio-analysis.md`. If a task here conflicts with that document, the architecture doc wins and this checklist must be updated, not the other way around.

This build is **singing tier only**. Speaking tier work is parked under `docs/phase-2-speaking-tier.md`. Do not extend `packages/speaking-metrics` as part of this work.

## Acceptance Target

Build 0.2 is complete when:

1. The mobile app captures live pitch via pitchy and renders it at ≤80ms latency on a mid-range device.
2. Pitchy's output flows into the existing `packages/audio-metrics` scoring functions without changes to their public API.
3. After an attempt completes, the captured audio uploads to `services/audio-processor` and is analyzed by a Python (librosa) pipeline.
4. The deep analysis returns a `DeepAnalysisResult` containing refined pitch, onset timing, RMS envelope, and a basic vibrato estimate.
5. The result is persisted with the attempt and visible to the coaching-rules engine.
6. The coaching tip rendered on the result screen incorporates at least one signal from the deep analysis (e.g., "your pitch was stable but your attack was late by 180ms — try anticipating the count").
7. A user-facing audio-storage consent flow gates the upload step. Default off, per the existing audio privacy invariant.
8. All four existing safety invariants from `agents.md` hold: safety-first, one correction per attempt, truthful feedback (noisy input → mic check), autonomy-supportive language.
9. `pnpm typecheck`, `pnpm test`, `pnpm format:check`, and `pnpm lint` all pass.

## Task Groups

Tasks are grouped by layer to match the architecture doc. Each group is sized to fit one focused Jules session.

### Group A — Client-Side Pitch Tracking (Layer 1)

Owner: Audio Metrics And DSP Agent. Depends on: nothing.

- [ ] Add `pitchy` to `apps/mobile/package.json` (caret range).
- [ ] Add an `AudioCaptureService` in `apps/mobile/src/services/audio/` that wraps Expo's `expo-av` / `expo-audio` recording API and exposes a frame-level stream.
- [ ] Wire pitchy into an audio worklet (or the closest Expo equivalent — investigate `react-native-audio-api` if worklets aren't directly supported in Expo SDK 52+) that consumes raw PCM and emits `LivePitchFrame` values to a Zustand store.
- [ ] Verify the existing `LivePitchFrame` shape in `@voice/shared-types` matches pitchy's output, or extend it with a clear migration note.
- [ ] Confirm `packages/audio-metrics` consumes the new frames without modification — its public functions (`evaluateFrame`, `scorePitchAccuracy`, `scoreStability`, `scoreOnset`, `scoreSustainedNote`, `micCheck`) should not need changes.
- [ ] Render a live pitch visualization on the sustained-note exercise screen (target line, tolerance band, current frequency, confidence indicator).
- [ ] Measure end-to-end latency from mic input to UI render on at least one iOS-class and one Android-class device. Log the result in the PR description.
- [ ] If measured latency exceeds 80ms, document the gap and the remediation path before merging. Do not merge a regression on the live-feedback invariant.

**Backup-plan marker.** If pitchy's confidence gates fire too aggressively in real-device testing — specifically, if any of the documented Build 0.1 noise scenarios produce more than 20% spurious low-confidence frames — open a follow-up task to evaluate CREPE. Do not switch tools inside Build 0.2; we want a clean evaluation surface.

### Group B — Server-Side Python Audio Processor (Layer 2, Stage 1)

Owner: Audio Processor Agent. Depends on: a clean API contract from Group D.

- [ ] Create `services/audio-processor/python/` with a FastAPI entrypoint at `python/main.py`.
- [ ] Add `services/audio-processor/requirements.txt` with pinned major versions (caret-equivalent for Python: use `~=` for minor-version stability): `fastapi`, `uvicorn`, `librosa`, `soundfile`, `numpy`, `pydantic`, `redis`, `supabase`.
- [ ] Add `services/audio-processor/Dockerfile` based on `python:3.11-slim`, installing system deps (`libsndfile1`, `ffmpeg`) and `pip install -r requirements.txt`.
- [ ] Implement `POST /analyze` endpoint that accepts an audio file (or a Supabase Storage URL) and an exercise context (target Hz, tolerance cents), returns a `DeepAnalysisResult`.
- [ ] Implement the analysis pipeline using librosa: pYIN for refined pitch with confidence, `onset_detect` for attack timing, `librosa.feature.rms` for envelope, basic vibrato estimation via autocorrelation of the smoothed pitch contour.
- [ ] Implement `/healthz` matching the current deployed signature (already returns `{"status":"ok","checks":{"supabase":"ok","redis":"ok"}}`).
- [ ] Add a deterministic test fixture: a synthesized reference tone (e.g., A4 with known characteristics) and an assertion that the pipeline returns the expected values within tolerance.
- [ ] Update `render.yaml`'s `voice-audio-processor` block (added in this PR as documented-not-yet-buildable) to point at the real Dockerfile path and remove the "provisioned via UI" comment.

### Group C — Deep Analysis Contract (Shared Types)

Owner: Domain Contracts Agent. Depends on: nothing. Blocks: B and D.

- [ ] Add `DeepAnalysisResult` to `packages/shared-types/src/index.ts`. Suggested shape: refined pitch contour, onset timestamps, RMS envelope summary statistics, vibrato rate + depth, overall analysis confidence.
- [ ] Add `AudioAnalysisJob` and `AudioAnalysisJobResult` to the existing job contracts so the audio-processor can run synchronously or be queued.
- [ ] Confirm no parallel domain types are introduced in `packages/audio-metrics` or `services/audio-processor` — both must consume from `@voice/shared-types`.

### Group D — API Integration

Owner: Backend API And Supabase Agent. Depends on: C.

- [ ] Add a `POST /api/attempts/:id/analyze` route in `services/api` that uploads the attempt's audio to the audio-processor and persists the returned `DeepAnalysisResult` against the attempt record.
- [ ] Gate the upload on the user's audio-storage consent flag (Group F).
- [ ] Return the deep analysis result inline with the attempt-completion response so the mobile app can display enriched coaching without a separate request.
- [ ] Add a Supabase migration for the `attempts.deep_analysis` JSONB column.

### Group E — Coaching Integration

Owner: Coaching Rules And Avatar Behavior Agent. Depends on: C, D.

- [ ] Extend `packages/coaching-rules` to consume `DeepAnalysisResult` and produce one (and only one) coaching tip drawing from the enriched signals.
- [ ] Update the avatar dialogue templates to support the new signal classes (onset timing, vibrato comments) while preserving the one-correction-per-attempt invariant.
- [ ] Add copy-lint test fixtures for the new templates.

### Group F — Audio Storage Consent Flow

Owner: Security Privacy And Compliance Agent in coordination with Mobile App Agent. Depends on: nothing. Blocks: D's upload step.

- [ ] Add a consent toggle in the mobile app's settings, defaulting OFF, persisted to the user profile via the existing API.
- [ ] Add a one-time consent prompt the first time the user completes an attempt while the toggle is off — "deep analysis requires uploading your recording, want to enable it for this attempt?"
- [ ] If consent is not granted, the attempt scores from live data only (existing Build 0.1 path) and the deep-analysis fields on the response are null. The coaching tip falls back to the existing rule set.
- [ ] Document the consent semantics in `docs/privacy/audio-consent.md` (new file).

### Group G — Avatar Voice Provider Interface (Layer 3 scaffold)

Owner: Coaching Rules And Avatar Behavior Agent. Depends on: nothing. Soft scope — can slip to Build 0.3 if Groups A–F run long.

- [ ] Define an `AvatarVoiceProvider` interface (likely in `packages/avatar-state` or a new `packages/avatar-voice`).
- [ ] Implement at least one provider adapter — Deepgram Aura-2 is the natural first candidate because the API key is already declared in `render.yaml`.
- [ ] Do not wire the avatar voice into the live UI in this build. The goal is to have the adapter pattern ready so Build 0.3 can A/B providers without re-architecture.
- [ ] Document the open evaluation in `docs/architecture/avatar-and-audio-analysis.md` Layer 3.

## Sequencing

Groups C and F can start immediately and have no upstream blockers.

Group A can start immediately and is fully independent of the server work.

Groups B and D depend on C. Run B and D after C lands, or coordinate a single PR that includes the shared-types changes alongside.

Group E depends on C and D.

Group G is parallelizable with everything and is the lowest-priority group — drop it cleanly if scope pressure builds.

## Out of Scope for Build 0.2

- Parselmouth integration (jitter, shimmer, formants). Tracked as Build 0.2.1.
- Speaking tier work of any kind.
- Karaoke pipeline.
- Real-time conversational LLM coaching.
- TTS provider selection (the adapter pattern lands here; the selection happens in Build 0.3).
- CREPE — only triggered as a fallback per the architecture doc.

## Postmortem-Style Notes To Remember

Lessons from the last two PRs that future agents working on Build 0.2 must heed:

- **Filtered installs on Render do not install root devDependencies.** Any new root-level lifecycle script (prepare, postinstall) must tolerate missing devDeps. The current `prepare: "lefthook install || true"` pattern is the model.
- **Do not commit directly to main.** Branch protection is active. All Build 0.2 work goes through PRs.
- **Caret ranges, not exact pins.** Lessons from PR #88.
- **Scope discipline.** PR #88 touched 82 files because of a Prettier sweep. If your Build 0.2 task touches files outside its declared group, stop and reconsider.
- **Do not modify `render.yaml`'s working blueprint sections.** If a Build 0.2 task needs new Render config, add to the audio-processor block defined in this PR; do not refactor existing service blocks.
