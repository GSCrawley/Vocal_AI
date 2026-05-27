# VOICE Project Milestones

> Last reviewed: 2026-05-26. Checked items reflect work merged to `main`. Unchecked items are upcoming.

## Build 0.1 — Singing Tier proof of concept
**Goal:** Prove one narrow vocal training loop (sustained-note/pitch).
- [ ] Microphone permission flow
- [ ] Mic check flow (signal presence/quality detection)
- [ ] Sustained-note exercise execution
- [ ] Live pitch guidance/feedback during exercise
- [ ] Post-exercise score calculation and display
- [ ] Best-take save and replay functionality

### Build 0.1 supporting work
- [x] Build 0.1 scope conflict resolved (sustained-note loop adopted; PR #25, commit `45284d8`)
- [x] `pnpm typecheck` passes across all workspace projects (commits `d389006`, `6ca3c9b`)
- [x] Jest tests landed for `shared-types`, `reward-engine`, `avatar-state`, `speaking-metrics`, `coaching-rules`, `content-schema`
- [x] Expo app shell present at `apps/mobile/App.tsx` (Sentry wired)
- [ ] `packages/audio-metrics` real implementation (Hz/cents, pitch accuracy, stability, onset, confidence, fixtures) — next Jules handoff target
- [ ] `packages/exercise-engine` SessionState machine and sustained-note attempt lifecycle — next Jules handoff target
- [ ] Mobile sustained-note screens (drafts PR #69, #73)

## Build 0.2 — Speaking Tier proof of concept
**Goal:** Prove one narrow speaking training loop.
- [ ] One 60-second speaking exercise (read a passage at a target pace)
- [ ] Live pace/pitch variability guidance during exercise
- [ ] Post-exercise score calculation and plain-language coaching tip

## MVP (Build 1.0)
**Goal:** Both tiers fully operational with core user loop.
- [ ] Both Speaking and Singing tiers functional
- [ ] Onboarding with tier + goal selection
- [ ] Baseline assessment
- [ ] Daily session structure (warm-up + core + reflection)
- [ ] Avatar coach with all behavioral states
- [ ] Progress tracking and XP/streak system
- [ ] Core exercise library (10+ exercises per tier)

## Phase 2 — Depth and engagement
**Goal:** Advanced functionality and features.
- [ ] Karaoke Mode (Singing Tier)
- [ ] Specialization tracks (Speaking Tier)
- [ ] SOVT warm-up exercises
- [ ] Adaptive difficulty
- [ ] Filler word real-time detection (Speaking)
- [ ] Push notifications with personalized prompts

## Phase 3 — Style and community
**Goal:** Extended content and social features.
- [ ] Style packs for Singing Tier (jazz, opera, metal, etc.)
- [ ] Advanced speaking specializations (TED, podcast, interview)
- [ ] Community features (optional: share recordings, compare progress)
- [ ] Optional live coaching tier (connect with human coaches)

## Infrastructure & Deployment
**Goal:** Production-deployable on Render with Supabase as the data/auth/storage authority.

### Completed (merged to `main`)
- [x] `render.yaml` blueprint authored (API, workers, Redis, audio processor)
- [x] `voice-api` deployed on Render (Node/Fastify, `/healthz`)
- [x] `voice-redis` provisioned on Render (Valkey)
- [x] `voice-analytics-worker` deployed on Render
- [x] `voice-notification-worker` deployed on Render
- [x] Zod env validation on `voice-api` boot (`services/api/src/config/env.ts`, PR #85)
- [x] Supabase Auth wired into `voice-api` (PR #80)
- [x] `services/audio-processor` Python/FastAPI service implemented with Redis job queue, `/healthz`, internal-token auth, tests (PR #84, #85)
- [x] `audio-processor-ci` GitHub Actions workflow (PR #85)
- [x] `docs/runbooks/render-deploys.md` runbook for secrets management
- [x] `.env.example` updated with `AUDIO_PROCESSOR_URL` and processor secrets

### Pending — manual operator action required
- [ ] **Provision `voice-audio-processor` on Render** (one-time human action). Use Render Dashboard → New → Blueprint (or New Web Service pointing at `services/audio-processor`) so the existing `render.yaml` definition is materialized into a running service. Confirm region Oregon, plan Starter, runtime Python 3.11, health check `/healthz`. Verify `voice-secrets` populated. Cannot be done by Jules — requires Render dashboard access and secret values.
- [ ] Verify `/healthz` returns `{"status":"ok"}` with redis and supabase both `ok` after first deploy
- [ ] Confirm `voice-api` can reach `voice-audio-processor` over internal network (default `http://voice-audio-processor:8000` or explicit `AUDIO_PROCESSOR_URL`)
- [ ] Verify branch protection on `main` is still active (per `agents.md` postmortem) before every direct-to-main task

### Pending — code work (later phases)
- [ ] `voice-admin` static site (Phase 2+)
- [ ] `voice-audio-worker` Python worker for Demucs/pYIN/Whisper/DTW (Phase 2)
- [ ] `voice-weekly-summary-cron` scheduled job
- [ ] `voice-data-retention-cron` scheduled job
- [ ] Supabase migrations tracked in repo
- [ ] Dockerfiles for API and workers
