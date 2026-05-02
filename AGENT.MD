# VOICE Agent Build Plan

This file is the agent orchestration guide for building VOICE with Jules or another automated agentic platform. It is based on a review of the full scaffold, including product docs, architecture docs, QA docs, the knowledge graph, package and service stubs, TypeScript configs, infrastructure placeholders, `render.yaml`, and `VocalAI Coaching Philosophy and Behavior Design Specification.pdf`.

## Source Of Truth

Agents must treat these files as authoritative, in this order:

1. `docs/KNOWLEDGE_GRAPH.md`
2. `packages/shared-types/src/index.ts`
3. `docs/product/*.md`
4. `docs/architecture/*.md`
5. `apps/mobile/src/navigation-map.md`
6. `VocalAI Coaching Philosophy and Behavior Design Specification.pdf`
7. Existing package and service source files

If documents conflict, agents must log the conflict and resolve it explicitly before implementation. The current major conflict is Build 0.1 scope: `README.md` describes a Speaking Tier pace loop, while `docs/product/build-0.1.md`, `docs/qa/build-0.1-test-matrix.md`, `apps/mobile/src/index.ts`, `packages/content-schema/src/index.ts`, and the PDF describe a Singing Tier sustained-note/pitch loop. The recommended first build target is the sustained-note loop because it is repeated across more implementation-facing files.

## Product Contract

VOICE is a coached vocal training app, not a metrics dashboard. Every agent must preserve these invariants:

- Safety first: never encourage pushing into strain.
- One correction per attempt: no stacked feedback.
- Truthful feedback: noisy, clipped, or low-confidence signals route to mic check instead of score claims.
- Autonomy-supportive language: offer choices, avoid shame and guilt.
- Competence scaffolding: start with achievable wins and increase difficulty slowly.
- Best-take replay is core, not optional.
- Reflection happens before reward summary at session end.
- Shared domain contracts live in `@voice/shared-types`; apps and services must not define parallel domain types.

## Current Scaffold Audit

The repository is a pnpm TypeScript monorepo with apps, services, shared packages, and detailed docs.

Implemented or partially implemented:

- Shared domain model in `packages/shared-types`.
- Scoring helpers for Speaking in `packages/speaking-metrics`.
- Initial singing pitch frame contract in `packages/audio-metrics`.
- Avatar state/dialogue helpers in `packages/avatar-state`.
- Reward rules in `packages/reward-engine`.
- Curriculum sequencing in `packages/curriculum`.
- Karaoke scoring/snippet helpers in `packages/karaoke-engine`.
- Audio processor TypeScript job contracts in `services/audio-processor`.
- Placeholder mobile, admin, API, analytics, notification, Docker, scripts, and Render files.

Known setup risks:

- `pnpm typecheck` currently fails at `packages/avatar-state` because several package `tsconfig.json` files set `rootDir: "src"` while importing `@voice/shared-types` through path aliases.
- `render.yaml` is empty and must be authored before Render deployment.
- Several package scripts are placeholders.
- `packages/content-schema` defines its own local `ExerciseDefinition`, which conflicts with the shared-types authority.
- Some imports and path aliases in `tsconfig.base.json` do not yet include every package listed in the docs.
- No real Expo app, Fastify API, Supabase schema, Python audio processor, tests, lint config, or CI pipeline is implemented yet.

## Global Build Order

Agents should execute in this order unless a coordinator explicitly changes the plan:

1. Contract and tooling stabilization
2. Build 0.1 scope resolution and acceptance criteria
3. Core package implementation and tests
4. Mobile sustained-note experience
5. API, Supabase schema, and persistence
6. Audio processing and metric calibration
7. Rewards, avatar, reflection, and progress integration
8. QA automation and device smoke testing
9. Render blueprint and deployment readiness
10. Phase 2 and Phase 3 feature work

## Required Agents

### 1. Build Coordinator Agent

Purpose: Own the execution plan, cross-agent sequencing, conflict resolution, and final acceptance.

Primary skills:

- Monorepo architecture
- Product-to-engineering translation
- Dependency planning
- Risk tracking
- Release criteria

Owned files:

- `AGENT.MD`
- `README.md`
- `docs/KNOWLEDGE_GRAPH.md`
- Build milestone docs

Responsibilities:

- Resolve the Build 0.1 scope conflict before app implementation.
- Keep the knowledge graph synchronized with implementation decisions.
- Maintain task boundaries between agents.
- Block implementation that duplicates shared domain contracts.
- Produce milestone checklists for Build 0.1, Build 0.2, MVP, Phase 2, and Phase 3.

Acceptance checks:

- Every agent has a clear file ownership boundary.
- Every feature maps to docs and tests.
- No unresolved product or architecture contradiction remains in active milestone scope.

### 2. Monorepo Tooling And CI Agent

Purpose: Make the workspace buildable, testable, lintable, and deployable.

Primary skills:

- pnpm workspaces
- TypeScript project references or package builds
- ESLint and Prettier
- Jest/Vitest
- CI setup
- Render blueprint basics

Owned files:

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `apps/*/tsconfig.json`
- `services/*/tsconfig.json`
- `packages/*/tsconfig.json`
- lint/test config files
- `render.yaml` in coordination with the Infrastructure Agent

Responsibilities:

- Fix typecheck rootDir/path alias issues.
- Add path aliases for all shared packages or adopt project references.
- Replace placeholder scripts with real scripts where practical.
- Add a consistent test runner and lint config.
- Ensure `pnpm typecheck`, `pnpm test`, and `pnpm build` are meaningful.
- Preserve strict TypeScript.

Acceptance checks:

- `pnpm typecheck` passes.
- Package imports resolve without duplicated local types.
- Test and lint commands either run real checks or are explicitly scoped as pending with documented reason.

### 3. Domain Contracts Agent

Purpose: Own shared types, schema versioning, and cross-package contracts.

Primary skills:

- TypeScript domain modeling
- Zod or JSON schema
- API contracts
- Backward-compatible versioning
- Supabase data modeling awareness

Owned files:

- `packages/shared-types/**`
- `packages/content-schema/**`
- contract sections of `docs/KNOWLEDGE_GRAPH.md`

Responsibilities:

- Make `@voice/shared-types` the single source of truth.
- Remove or replace local duplicate types in `content-schema`.
- Add typed exercise schema validation.
- Define Build 0.1 entities: user profile, session, attempt, singing metrics, best take, reflection, XP event.
- Keep exercise definitions versioned and immutable.

Acceptance checks:

- No app, service, or package defines duplicate domain types.
- Exercise scoring weights validate to 1.0.
- Historical exercise IDs remain valid.

### 4. Audio Metrics And DSP Agent

Purpose: Implement trustworthy audio metric algorithms for on-device and post-attempt scoring.

Primary skills:

- Audio DSP
- Pitch detection concepts: YIN/pYIN, cents conversion, voiced frames
- VAD, RMS, signal quality gates
- Mobile performance constraints
- Test fixtures and numeric calibration

Owned files:

- `packages/audio-metrics/**`
- singing portions of `packages/coaching-rules/**`
- audio sections of `docs/KNOWLEDGE_GRAPH.md`

Responsibilities:

- Implement Hz-to-cents conversion.
- Implement pitch accuracy, stability, onset, completion, and confidence scoring.
- Add mic check helpers for noise floor, clipping, and minimum voiced frames.
- Define degraded scoring behavior.
- Add deterministic test fixtures for reference tones and noisy inputs.

Acceptance checks:

- Pitch scoring is deterministic and tested.
- Low-confidence or noisy input is not scored as if reliable.
- Live feedback target remains under the documented 80ms latency budget where measurable.

### 5. Speaking Metrics Agent

Purpose: Build the Speaking Tier metric and coaching foundation.

Primary skills:

- Speech analytics
- WPM, pause, prosody, RMS, filler metrics
- Goal-weighted scoring
- Coaching copy constraints

Owned files:

- `packages/speaking-metrics/**`
- speaking portions of `packages/coaching-rules/**`
- speaking tier docs when implementation clarifies behavior

Responsibilities:

- Harden existing WPM, prosody, projection, and filler scoring.
- Add fixtures for target WPM contexts.
- Define server-side filler detection contracts with the Audio Processor Agent.
- Keep Speaking Tier ready for the README's stated proof-of-concept if it becomes Build 0.1.

Acceptance checks:

- Goal-weighted scoring matches docs.
- Coaching output has one correction and no shame language.
- Speaking analysis tolerates incomplete Phase 2 metrics.

### 6. Exercise And Session Engine Agent

Purpose: Implement the session state machine and exercise orchestration used by mobile and API.

Primary skills:

- State machines
- Session planning
- Attempt lifecycle design
- Tier-aware orchestration
- Pure TypeScript package design

Owned files:

- `packages/exercise-engine/**`
- session state portions of `packages/shared-types/**`

Responsibilities:

- Implement the documented SessionState transitions.
- Build session plans from curriculum and exercise definitions.
- Manage attempt lifecycle: intro, awaiting signal, listening, analyzing, result, retry or continue.
- Ensure no direct jump from listening to completion.
- Provide pure functions suitable for unit testing.

Acceptance checks:

- Invalid state transitions are rejected.
- Build 0.1 sustained-note loop can be represented end to end.
- Session plans include at least one completed attempt before XP or streak credit.

### 7. Curriculum And Content Agent

Purpose: Convert product specs into versioned exercises and lesson plans.

Primary skills:

- Instructional design
- Content schema authoring
- Vocal coaching progression
- Safety-aware curriculum design

Owned files:

- `packages/curriculum/**`
- `packages/content-schema/**`
- `docs/product/*tier-spec.md`

Responsibilities:

- Seed Build 0.1 sustained-note exercise and any required warm-up or mic-check content.
- Build Level 1 speaking and singing exercise catalogs.
- Keep progression conservative: comfortable range first, harder tasks later.
- Add prerequisites, minimum level gates, and feature phase gates.

Acceptance checks:

- Each active exercise has tier, category, target pattern, evaluation config, scoring weights, and feedback rule set.
- Exercise IDs are versioned.
- Build 0.1 can start from a known exercise definition.

### 8. Coaching Rules And Avatar Behavior Agent

Purpose: Own deterministic feedback, avatar state, and dialogue quality.

Primary skills:

- Dialogue systems
- Coaching language design
- State machines
- Safety copy
- Template-driven feedback

Owned files:

- `packages/coaching-rules/**`
- `packages/avatar-state/**`
- avatar and coaching sections of docs

Responsibilities:

- Map metric patterns to one feedback payload.
- Enforce praise, correction, action tip, and optional micro-exercise structure.
- Implement avatar state resolution from session state, score band, milestones, and personal bests.
- Add copy lint tests for prohibited terms and stacked corrections.
- Support deterministic templates first; LLM personalization is later and constrained.

Acceptance checks:

- Coaching payload never contains multiple corrections.
- Excellent and personal-best outcomes can trigger CELEBRATING.
- Mic check and strain warnings override normal coaching.

### 9. Reward And Progress Agent

Purpose: Implement XP, streaks, badges, unlocks, best-take progress, and reflection sequencing.

Primary skills:

- Gamification grounded in Self-Determination Theory
- Pure reward rules
- Progress visualization data
- Time/date edge cases

Owned files:

- `packages/reward-engine/**`
- reward sections of `packages/shared-types/**`
- progress data contracts

Responsibilities:

- Complete XP event evaluation.
- Fix badge catalog gaps, including `best_take` if retained in shared types.
- Implement streak shields without guilt language.
- Ensure reflection is processed before reward summary.
- Provide progress deltas such as baseline vs best vs latest.

Acceptance checks:

- XP comes from meaningful actions only.
- Streak break copy is neutral.
- Best-take and personal-best events produce consistent XP and progress state.

### 10. Mobile App Agent

Purpose: Build the Expo React Native user app.

Primary skills:

- Expo and React Native
- React Navigation
- Zustand
- Mobile audio permissions and recording
- Lottie
- Accessible mobile UI

Owned files:

- `apps/mobile/**`
- mobile-specific assets
- `apps/mobile/src/navigation-map.md` when implementation changes route names

Responsibilities:

- Replace the placeholder app with an Expo app shell.
- Implement onboarding, mic permission, mic check, sustained-note exercise, result, best-take replay, reflection, and session complete for Build 0.1.
- Use shared packages for scoring, coaching, session state, rewards, and avatar behavior.
- Use `@voice/ui-tokens` instead of hardcoded theme scatter.
- Store local best take for Build 0.1 if backend is not ready, then integrate API persistence.

Acceptance checks:

- App opens on iOS-class and Android-class targets.
- Mic permission denial and retry are handled.
- Mic check blocks unreliable scoring.
- Sustained-note loop completes and shows score plus one coaching tip.
- Best-take replay is available after an attempt.

### 11. Backend API And Supabase Agent

Purpose: Build the Fastify API and persistence layer.

Primary skills:

- Node.js and Fastify
- Supabase Auth, Postgres, Storage, and Realtime
- API validation
- Auth and row-level security
- REST contract design

Owned files:

- `services/api/**`
- `docs/api/**`
- Supabase migration files once added

Responsibilities:

- Implement route groups from `docs/api/openapi-draft.md` and `docs/KNOWLEDGE_GRAPH.md`.
- Add profile, exercise, session, attempt, reflection, best-take, rewards, and analytics endpoints for Build 0.1.
- Validate request and response bodies against shared contracts.
- Store audio only with explicit consent.
- Integrate queue contracts for audio-processor jobs where needed.

Acceptance checks:

- Authenticated users can create sessions and attempts.
- Attempt submission can return score, coaching payload, XP events, and personal-best state.
- RLS prevents cross-user data access.

### 12. Audio Processor Agent

Purpose: Build the Python audio processing service and keep TypeScript job contracts aligned.

Primary skills:

- Python FastAPI
- Demucs
- librosa/pYIN
- Whisper
- DTW
- Redis queue workers
- Audio storage pipelines

Owned files:

- `services/audio-processor/**`
- future `services/audio-processor/python/**`
- audio processor job/result contracts

Responsibilities:

- Keep TypeScript job contracts stable for the API.
- Add Python FastAPI service and worker scaffolding.
- Implement Phase 2 jobs: vocal separation, vocal analysis, filler detection, karaoke comparison.
- For Build 0.1, only implement server work if mobile/backend persistence needs post-attempt processing.

Acceptance checks:

- Job contracts are serializable and versionable.
- Python service can run locally.
- Phase 2 jobs store results in the expected shape.

### 13. Admin And Content Ops Agent

Purpose: Build internal tooling for exercise, content, rules, and operational review.

Primary skills:

- Admin web app development
- Content management
- Schema validation UI
- Internal workflow design

Owned files:

- `apps/admin/**`
- admin API routes in `services/api/**`

Responsibilities:

- Replace placeholder admin app with a minimal content operations shell.
- Add exercise schema validation and preview.
- Add feedback template and rule set management.
- Add read-only analytics/progress inspection after Build 0.1.

Acceptance checks:

- Admin users can inspect active exercise definitions.
- Invalid exercise configs cannot be published.
- Content changes preserve versioning rules.

### 14. Analytics And Notification Agent

Purpose: Implement product events, aggregates, reminders, and notification orchestration.

Primary skills:

- Event instrumentation
- Background workers
- Expo push notifications
- Analytics-safe schema design
- Cron jobs

Owned files:

- `services/analytics-worker/**`
- `services/notification-worker/**`
- analytics event contracts in shared types

Responsibilities:

- Implement append-only analytics event ingestion and aggregation.
- Produce progress snapshots and weekly summaries.
- Implement notification jobs for reminders and milestones.
- Avoid guilt framing in notification copy.

Acceptance checks:

- Build 0.1 events are emitted: mic permission, mic check, session, exercise, attempt, score, best take, replay, reflection.
- Reminder jobs respect user schedule and opt-out.
- Aggregations are idempotent.

### 15. Infrastructure And Render Agent

Purpose: Make the system runnable locally and deployable on Render.

Primary skills:

- Render blueprints
- Docker
- Environment variables
- Service topology
- Redis, Supabase, worker deployment

Owned files:

- `render.yaml`
- `infrastructure/docker/**`
- `infrastructure/scripts/**`
- service Dockerfiles when added
- `.env.example` when added

Responsibilities:

- Author `render.yaml` for API, workers, audio processor, Redis, and any static/admin service needed.
- Add Dockerfiles for API and workers.
- Document required environment variables.
- Add bootstrap, migration, and release scripts.
- Coordinate with Backend and Audio Processor Agents on health checks.

Acceptance checks:

- Render blueprint is non-empty and valid.
- Services have health checks.
- Local bootstrap steps are documented and reproducible.

### 16. QA And Test Automation Agent

Purpose: Own test strategy, acceptance tests, and regression coverage.

Primary skills:

- Unit, integration, and mobile smoke testing
- Jest/Vitest
- Expo/device QA
- Audio fixture testing
- Accessibility checks

Owned files:

- `docs/qa/**`
- test files across packages/apps/services
- CI test workflow files when added

Responsibilities:

- Expand `docs/qa/build-0.1-test-matrix.md`.
- Add unit tests for pure packages.
- Add API integration tests.
- Add mobile smoke tests for onboarding and sustained-note loop.
- Define device and environment coverage for quiet and moderate-noise rooms.

Acceptance checks:

- Build 0.1 test matrix covers success, denial, noisy input, clipping, retry, and replay.
- Core package tests run in CI.
- Known untestable device behaviors are documented with manual QA steps.

### 17. Karaoke And Music Licensing Agent

Purpose: Own Phase 2 karaoke architecture, song processing, snippet flow, and legal guardrails.

Primary skills:

- Music/audio product design
- DTW comparison contracts
- Song search and processing pipelines
- Copyright/licensing constraints
- Supabase Storage and streaming constraints

Owned files:

- `packages/karaoke-engine/**`
- karaoke routes in API
- karaoke product docs

Responsibilities:

- Keep karaoke gated until Phase 2.
- Align scoring weights, because the knowledge graph uses 50/30/20 while current code uses 60/20/20.
- Ensure separated stems are not downloadable and not exposed as a general-purpose tool.
- Implement phrase map and snippet unlock logic with mobile/backend agents.

Acceptance checks:

- Karaoke cannot launch without licensing path documented.
- Snippet completion thresholds match docs.
- User-facing results frame "ready to move on" instead of pass/fail.

### 18. Security Privacy And Compliance Agent

Purpose: Own privacy, audio consent, auth boundaries, safety disclaimers, and abuse prevention.

Primary skills:

- Mobile privacy flows
- Supabase RLS
- Data retention
- Audio storage consent
- Safety and medical-claim review

Owned files:

- privacy/data docs when added
- Supabase policies with Backend Agent
- safety copy with Coaching Agent

Responsibilities:

- Ensure raw audio is not stored unless user opts in.
- Define deletion/export paths for user data.
- Review all vocal health language to avoid medical diagnosis.
- Enforce per-user authorization for sessions, attempts, audio, and karaoke artifacts.

Acceptance checks:

- Default audio storage is off.
- RLS policies cover all user-owned tables.
- Pain, strain, and hoarseness flows advise stopping/resting without diagnosis.

## Agent Dependency Graph

```text
Build Coordinator
  -> Monorepo Tooling And CI
  -> Domain Contracts

Domain Contracts
  -> Audio Metrics And DSP
  -> Speaking Metrics
  -> Exercise And Session Engine
  -> Curriculum And Content
  -> Reward And Progress
  -> Backend API And Supabase

Audio Metrics And DSP
  -> Coaching Rules And Avatar Behavior
  -> Mobile App
  -> QA And Test Automation

Exercise And Session Engine
  -> Mobile App
  -> Backend API And Supabase

Backend API And Supabase
  -> Analytics And Notification
  -> Infrastructure And Render
  -> Security Privacy And Compliance

Audio Processor
  -> Karaoke And Music Licensing
  -> Infrastructure And Render

Mobile App
  -> QA And Test Automation
```

## Jules Execution Notes

Recommended Jules task groups:

```yaml
task_groups:
  build_0_1_foundation:
    agents:
      - build-coordinator
      - monorepo-tooling-ci
      - domain-contracts
      - audio-metrics-dsp
      - exercise-session-engine
      - coaching-avatar
      - reward-progress
      - mobile-app
      - qa-test-automation
    deliverable: "Local Build 0.1 sustained-note coaching loop"

  backend_persistence:
    agents:
      - backend-api-supabase
      - security-privacy-compliance
      - analytics-notification
      - infrastructure-render
    deliverable: "Authenticated session, attempt, best-take, reflection, reward, and event persistence"

  phase_2_karaoke:
    agents:
      - audio-processor
      - karaoke-music-licensing
      - backend-api-supabase
      - mobile-app
      - infrastructure-render
      - qa-test-automation
    deliverable: "Licensed educational karaoke snippet practice pipeline"
```

## Build 0.1 Acceptance Target

Until the Build Coordinator resolves the scope conflict differently, Build 0.1 means:

1. App opens.
2. Mic permission can be granted, denied, and retried.
3. Mic check detects signal presence, noise floor, and clipping risk.
4. User performs one sustained-note exercise.
5. Live pitch feedback shows target, tolerance band, and current pitch confidence.
6. Result screen shows one overall score, pitch/stability detail, and one coaching tip.
7. Best take is saved and replayable.
8. Reflection asks two quick prompts.
9. XP/reward summary appears after reflection.
10. Core events are recorded.
11. `pnpm typecheck` and relevant package tests pass.

## Do Not Build Yet

Do not implement these until their phase gate opens:

- Full karaoke song processing and vocal separation
- Public stem export or sharing
- Community/social features
- Style packs
- Extreme vocal technique training
- Real-time filler detection if it blocks Build 0.1
- LLM-personalized coaching that can invent metric claims
- Medical diagnosis or health scoring

## Required Review Checklist For Every Agent PR

- Does this import shared domain types instead of redefining them?
- Does this preserve one-correction coaching?
- Does this route noisy or clipped audio to mic check?
- Does this avoid shame, pressure, and streak guilt?
- Does this protect audio privacy and consent?
- Does this add or update tests for changed behavior?
- Does this update docs when behavior changes?
- Does this keep Build 0.1 smaller than MVP?

