# Avatar and Audio Analysis Architecture

> Status: Accepted, 2026-05-29. Supersedes any dual-tier (singing + speaking) audio architecture implied by earlier docs. Speaking Tier work is parked under `docs/phase-2-speaking-tier.md` and will leverage the infrastructure described here.

## Purpose

This document defines the audio analysis and avatar interaction architecture for VOICE's Singing Tier — the system that lets the avatar coach genuinely "hear" the user, evaluate their vocal output across pitch, timing, stability, and voice quality dimensions, and respond with feedback that is both accurate and pedagogically useful.

It exists because the product invariant — "a good ear" — is the single hardest engineering problem in the project. Every other concern (avatar dialogue, reward systems, curriculum sequencing, even the mobile app shell) depends on this layer producing trustworthy signals. If the audio analysis is wrong, the coaching is wrong, and the product is a worse version of a tuner app.

## Design Constraints

Every choice in this architecture must satisfy:

1. **Live feedback under 80ms latency.** The user must see pitch guidance during a sustained note in real time. This rules out server-round-trips for the live path.
2. **Trustworthy degraded behavior.** Noisy, clipped, or low-confidence input must route to mic check, not produce false scores. From `agents.md` Product Contract.
3. **Mobile-class compute budget on the client.** The live path runs in Expo React Native on user devices. No GPU assumptions, no 5MB-model downloads on first run.
4. **Post-attempt depth on the server.** The deep analysis path runs after the user finishes an attempt. Latency budget here is multiple seconds, compute budget is whatever Render's Starter plan allows (512 MB RAM at minimum, with headroom for future plan upgrades).
5. **Replaceable layers.** Each layer's chosen tool must be swappable. We are evaluating among alternatives, not locking in vendors prematurely.

## The Three-Layer Stack

The Singing Tier audio + avatar system is built as three independent layers. Each layer has a defined contract with the layers above and below it, so individual layers can be reimplemented without cascading changes.

### Layer 1: Client-Side Pitch Tracking (live, on-device)

**Purpose.** Produce a stream of `LivePitchFrame` values (frequency in Hz, confidence 0-1, voiced boolean) during an exercise attempt, at ~50-100 frames per second, with under 80ms end-to-end latency from microphone capture to UI render.

**Primary recommendation.** [`pitchy`](https://github.com/ianprime0509/pitchy) — a small, pure-JavaScript YIN/McLeod pitch detector. ~5KB gzipped, no model download, runs synchronously in the audio worklet thread. Accuracy is sufficient for sustained-note exercises in quiet-to-moderate-noise environments, which matches the Build 0.1 scope.

**Backup plan.** If pitchy's accuracy proves insufficient in real-world testing — specifically, if confidence gates trigger too often in the moderate-noise conditions documented in `docs/qa/build-0.1-test-matrix.md`, or if false-negative voiced detection causes scoring failures on legitimate user input — switch to [CREPE](https://github.com/marl/crepe) (TensorFlow.js port). CREPE is a deep-learning pitch tracker, more accurate but with a ~5MB model download on first run and meaningfully higher CPU cost. The switch is a contained change because both tools satisfy the same `LivePitchFrame` contract defined in `@voice/shared-types`.

**Output contract.** Frames are consumed by `packages/audio-metrics` (already implemented as of PR #87) for scoring, and by the mobile UI for live visualization.

### Layer 2: Server-Side Deep Analysis (post-attempt, on-device upload)

**Purpose.** After the user completes an attempt, the captured audio is uploaded to `services/audio-processor` and analyzed in depth. This layer produces enriched metrics that the live layer cannot — refined pitch (pYIN with smoothing), voice quality (jitter, shimmer), formants, spectral features — and feeds them into the post-attempt scoring and coaching pipeline.

This layer is what gives the avatar a "good ear" in the pedagogical sense. The live layer says "you're at 437 Hz, target is 440." The deep layer says "your pitch was stable but your vibrato rate was 5.2 Hz with high shimmer — try relaxing your jaw."

**Staged rollout.**

**Stage 1 (Build 0.2).** Implement [librosa](https://librosa.org/) on the Python audio-processor service. Provides refined pYIN pitch with frame-level confidence, onset detection (for evaluating attack quality), RMS envelope (for projection/dynamics scoring), and spectral flux (for vibrato detection). Librosa alone covers ~80% of the Build 0.2 acceptance criteria.

**Stage 2 (Build 0.2.1, follow-up).** Add [parselmouth](https://parselmouth.readthedocs.io/) — Python bindings to Praat, the long-standing gold standard for vocal pedagogy research. Provides jitter and shimmer (voice quality / hoarseness indicators), formant extraction (vowel shaping), and harmonics-to-noise ratio (breathiness). The reason this is staged: parselmouth carries a meaningful cold-start cost on Render's Starter plan, and we want the librosa pipeline proven and deployed before we double the dependency surface.

**Output contract.** A `DeepAnalysisResult` shape to be defined in `@voice/shared-types` as part of Build 0.2 — consumed by the API attempt-completion endpoint and the coaching-rules engine.

### Layer 3: Conversational Avatar (TTS, optional STT)

**Purpose.** Give the avatar a voice. Render coaching feedback as natural speech rather than text. For exercises where the user needs to mimic the coach's example tone, the avatar's voice must produce a clean reference signal.

**Decision status: evaluating, not locked.** The candidate list:

- **Deepgram Aura-2.** Currently declared in `render.yaml` as `DEEPGRAM_API_KEY`. Strong real-time TTS, sub-200ms first-byte latency, good prosody.
- **ElevenLabs.** Currently declared in `render.yaml` as `ELEVENLABS_API_KEY`. Highest voice quality, broader voice library, higher latency, more expensive.
- **OpenAI Realtime / TTS.** Currently declared in `render.yaml` as `OPENAI_API_KEY`. Tightly integrated with the LLM layer if we go that route for coaching personalization.
- **Resemble AI** or similar voice-cloning providers, if the avatar identity calls for a custom voice.

**Seeds planted for later decision.** Build 0.2 will introduce a thin `AvatarVoiceProvider` interface in `packages/avatar-state` (or a new `packages/avatar-voice` sibling, TBD during implementation) that abstracts the TTS call. Each candidate is implemented as a provider adapter. This lets us evaluate side-by-side in actual user sessions before committing. The "best solution" criterion is: lowest first-byte latency among candidates that meet a quality bar (no obvious robotic artifacts, prosody appropriate for coaching tone) at a cost ceiling we define when we have usage data.

**STT (speech-to-text).** Not in Build 0.2 scope. The Singing Tier does not require STT for its core loop — the user is singing, not speaking, and the analysis is acoustic. STT becomes relevant only if we add voice-driven user input for navigation / reflection prompts. Marked as Build 0.3+ consideration.

## What This Architecture Does Not Include

To keep the scope honest:

- **No real-time conversational AI loop.** The avatar speaks at scripted moments (intro, result, encouragement) — it is not a continuous dialogue partner. That's a Phase 2+ consideration and would require LLM integration we haven't sized.
- **No karaoke / multi-track separation.** That's the existing `packages/karaoke-engine` work and stays gated to Phase 3 per `agents.md`.
- **No speaking-tier analysis.** Parked. See `docs/phase-2-speaking-tier.md`.
- **No filler-word detection.** Same — that's a speaking-tier concern.

## Sequencing

Build 0.2 implements Layer 1 (pitchy on the client) and Layer 2 Stage 1 (librosa on the server). Layer 3 lands as an interface and at least one provider adapter, but the actual evaluation of TTS vendors happens during Build 0.3 when there are real user sessions to evaluate against. Layer 2 Stage 2 (parselmouth) follows Build 0.2 as a focused follow-up.

The Build 0.2 task list is at `docs/build-0.2-audio-analysis.md`.

## Open Questions Tracked Here

These are explicitly unresolved and should be revisited at the milestones noted:

- **Pitchy adequacy at moderate noise floor.** Revisit at end of Build 0.2 with real-device test data.
- **TTS provider selection.** Revisit during Build 0.3 with side-by-side user testing.
- **Whether `DeepAnalysisResult` lives in `@voice/shared-types` or `@voice/audio-metrics`.** Resolve during Build 0.2 implementation; default is `@voice/shared-types` per the existing single-source-of-truth rule.
- **Render plan upgrade.** Parselmouth's cold-start may force a move from Starter to Standard on the audio-processor service. Revisit when parselmouth lands.
- **Audio storage policy.** Build 0.2 will require uploading attempt audio to the server. The default-off audio storage rule from `agents.md` still applies. Revisit the consent flow when the upload pipeline is designed.
