# VOICE — Target Baseline & Avatar Design Notes (Mid-Build Addendum)

> Status: decision record / design intent. Supplements `singing-tier-spec.md`,
> `karaoke-mode-spec.md`, `reward-system-spec.md`, and `ai-avatar-spec.md`.
> Companion research: `perplexity-mid-build-research-brief.md`.

## 1. Context

The singing tier uses a **dual-baseline** learning model:

- **Current-skill baseline** (built): guided range walk + sustained holds →
  range, pitch accuracy, stability, breath, tone (HNR/CPP/jitter/shimmer),
  recommended key → baseline snapshot.
- **Target baseline** (this note): the goal the user trains toward.
- **Adaptive path**: distance(current → target) → gamified goal matrix of
  exercises + encouragement, until the user can emulate the target.

This note records two decisions taken mid-build.

## 2. Decision: Synthesized "Best-Possible-Self" as the PRIMARY target

Rather than only targeting a third-party performer, the primary target baseline
is a **simulated best realistic version of the user's own voice**, generated
from configuration-stage probe exercises.

Rationale:

- Avoids the demoralization and unhealthy-imitation risk of targeting a pro.
- Sidesteps third-party copyright entirely.
- High motivational payoff ("that's _me_?").
- Reuses data we already capture (the current-baseline pipeline IS the
  configuration sample) — additive, not a rewrite.

Hard constraints (must hold or the feature is harmful):

- The synthesized target is a **motivational preview, NOT a scientific
  forecast or guaranteed ceiling.** Frame it explicitly as a simulation.
- Any predicted ceiling must reflect the **realistic, bounded, slow** envelope
  of trainable vocal gain — not an unlimited ideal.
- Vocal health and truthfulness override motivation, always.

### Configuration flow (intent)

A short (~5–8 min) set of probe exercises that reveal latent capacity beyond
current performance: extended range probe, passaggio probe, breath-capacity
probe, tone-quality probe — building on the existing range-walk + sustained-hold
capture. Output feeds a "target ceiling" estimate, then optional synthesis +
playback, with reaction capture.

## 3. Decision: Third-party target vocals = FALLBACK / alternate mode only

User-supplied or legally-sourced reference vocals remain supported (leveraging
existing vocal_separation / vocal_analysis / karaoke compare), but are demoted
to a secondary path due to copyright/ToS exposure and studio-recording
"inflation" of the gap. Quality gates before profiling are mandatory.

## 4. Decision: Minimalist "woofer" avatar (not cartoonish)

The AI vocal coach is an **abstract, audio-reactive form** — a talking circle
evoking an old-style speaker-cabinet woofer that vibrates/pulses with the
coach's speech, plus subtle synced haptics. It is NOT an anthropomorphic
character.

- Reuses existing avatar state machine: IDLE, INTRO, LISTENING, ANALYZING,
  COACHING, CELEBRATING (`packages/avatar-state`).
- Audio-reactive cone motion maps to the coach's TTS amplitude/frequency;
  motion should read as "alive and warm," not mechanical.
- Haptics sync to coach speech, success moments, and breath/rhythm cues; kept
  subtle; accessibility-aware.
- Persona/tone shifts across singing sub-personas (bathroom singer → aspiring
  performer) without gimmickry.

## 5. Open questions (defer to user testing)

- Does a synthesized "future voice" motivate or discourage when the gap is large?
- Synthesis quality threshold that motivates vs. reads as fake.
- Whether the coach should ever _demonstrate_ by singing (ties to synthesis).

## 6. Build impact

Additive. No teardown of the current baseline pipeline. New work: target-ceiling
estimation, optional synthesis layer, target profile storage, gap engine,
roadmap generation, gamification policy engine, avatar audio/haptic runtime.
