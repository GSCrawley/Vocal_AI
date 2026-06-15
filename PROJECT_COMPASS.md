# PROJECT COMPASS — VOICE (Vocal_AI)

> READ THIS FIRST. Before approving, advising, or acting on ANY task (yours or Jules'),
> read this file and reconcile the task against it. If a task targets code that is not
> present on `main`, run the stale / lost / future triage (see below) BEFORE proceeding.
> This file is the quick-orientation layer above `agents.md` (the full Source of Truth).

## 1. What this project is (goal)

VOICE is a mobile-first vocal training platform. Its real value is NOT "AI analyzes your
voice" — it is helping a person build accurate self-hearing, self-trust, and repeatable
practice habits that turn isolated good moments into stable vocal skill.

Core loop for every exercise: RECORD the user's voice -> ANALYZE the frames -> SCORE ->
give ONE clear, plain-language coaching cue. The user's voice MUST be recorded and
analyzed; this begins with the baseline-creation process.

## 2. Current phase

- **Build 0.1 — Singing, Sustained-Note loop.** Prove ONE narrow loop: mic permission ->
  mic check -> sustained-note exercise -> live pitch feedback -> post-exercise score ->
  plain-language coaching tip.
- **Strategy: SINGING-FIRST.** Speaking Tier is parked for Phase 2. (Note: `README.md`
  historically described a Speaking pace loop — that conflict is resolved in favor of
  singing-first per `agents.md`.)
- Keep Build 0.1 strictly SMALLER than MVP. Do not build ahead of the phase gate.

## 3. What is REAL vs STUBBED (keep this current)

REAL and tested (the foundation — trust these):
- `@voice/audio-metrics` — micCheck, scoreSustainedNote, pitch/stability/onset scoring.
- `@voice/exercise-engine`, `@voice/coaching-rules`, `@voice/shared-types`,
  `@voice/content-schema`, `@voice/ui-tokens`.

STUBBED / preview only (do NOT assume these are functional):
- `apps/mobile` — currently a lightweight PREVIEW shell. App.tsx is a useState stage flow;
  screens (Home, Permission, MicCheck, SustainedNoteDemo) are static UI with no real
  capture. There is NO navigation stack, NO zustand store, NO constants/ on `main`.

KNOWN LOST WORK (regressions to be aware of):
- Commit `afd898f` (mislabeled "test: add scoreStability tests") rewrote `apps/mobile`
  down to the preview shell and DROPPED the functional Build 0.1 mobile implementation
  that merged PR #69 (`98fa78d`) had added: `useRecording.ts`, `usePitchAnalysis.ts`,
  the navigation stack, the zustand `sessionStore`, and `constants/`.
- Separately, PR #59's `computePitchSimilarity` optimization was lost by an earlier bad
  merge (re-integration tracked in its own session).

## 4. Strategic build order (foundation before features)

Do not build a floor before the one beneath it exists:
1. Pure-logic packages (audio-metrics etc.) — DONE / maintained.
2. Capture layer: `useRecording` (expo-av mic metering -> RMS frames). REQUIRED for baseline.
3. Adapter: `usePitchAnalysis` (RMS frames -> audio-metrics micCheck/scoreSustainedNote).
4. Mobile test infrastructure (jest + RN/expo preset + expo-av mock) so the above ship tested.
5. Re-wire the loop into real screens / decide preview-vs-functional deliberately.
6. API + Supabase persistence; rewards/avatar/reflection; QA; Render deploy; Phase 2.

## 5. Hard infra constraint (do not regress)

Render services run on a 512MB plan. Populating `apps/mobile` with a heavy Expo + Sentry
React Native dependency tree previously OOM-killed ALL service builds. The per-service
install step MUST be filtered with `--filter "@voice/<service>..."` — filtering only the
build step is NOT enough. Keep the mobile workspace as light as the phase allows.

## 6. The triage rule (apply before concluding a premise is invalid)

If a task targets an optimization/file that isn't on `main`, it is one of three things —
never "made up out of nothing":
- **Stale** — premise no longer applies -> redirect the task.
- **Lost** — it existed but a bad merge dropped it -> find the source commit and restore it
  surgically (never wholesale-revert; preserve newer work).
- **Future** — groundwork for planned work -> make sure the underlying work actually gets done.

## 7. How to keep this file honest

Update Section 3 whenever something moves from stubbed -> real (or is lost). Add new
regressions to KNOWN LOST WORK. This file is only useful if it reflects `main` as it is today.
