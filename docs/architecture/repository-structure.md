# VOICE — Repository Structure

## Monorepo layout

```
VOCAL_AI/
├── apps/
│   ├── mobile/                    # Expo (React Native) — iOS + Android user app
│   └── admin/                     # Internal content + ops tooling
│
├── services/
│   ├── api/                       # Main Node.js/Fastify backend API
│   ├── audio-processor/           # Python/FastAPI — Demucs, pYIN, Whisper jobs
│   ├── analytics-worker/          # Background aggregations and progress summaries
│   └── notification-worker/       # Push notification orchestration
│
├── packages/
│   ├── shared-types/              # All shared domain contracts (SINGLE SOURCE OF TRUTH)
│   ├── exercise-engine/           # Session and exercise orchestration (tier-aware)
│   ├── coaching-rules/            # Score-to-feedback mapping for both tiers
│   ├── audio-metrics/             # Singing metric contracts and score helpers
│   ├── speaking-metrics/          # Speaking-specific metrics: pace, prosody, fillers
│   ├── curriculum/                # Lesson plans, exercise sequencing, level logic
│   ├── content-schema/            # Versioned schema contracts for exercises and plans
│   ├── karaoke-engine/            # Karaoke mode: snippet selection, DTW comparison
│   ├── reward-engine/             # XP, streaks, badges, unlocks
│   ├── avatar-state/              # Avatar state machine and dialogue system
│   └── ui-tokens/                 # Design tokens: colors, typography, spacing
│
├── docs/
│   ├── architecture/
│   │   ├── repository-structure.md    ← this file
│   │   └── technical-stack.md
│   ├── product/
│   │   ├── product-vision.md
│   │   ├── speaking-tier-spec.md
│   │   ├── singing-tier-spec.md
│   │   ├── karaoke-mode-spec.md
│   │   ├── ai-avatar-spec.md
│   │   └── reward-system-spec.md
│   ├── api/
│   │   └── openapi-draft.md
│   └── qa/
│       └── build-0.1-test-matrix.md
│
├── package.json                   # Root pnpm workspace config
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Architectural rules

### 1. Shared types are the authority
All domain types live in `packages/shared-types`. No package or app should define its own versions of `Tier`, `ExerciseDefinition`, `SuccessBand`, etc. Import from `@voice/shared-types`.

### 2. No domain logic in the mobile app
Business logic (scoring, coaching rules, curriculum sequencing, reward computation) belongs in the shared packages. The mobile app calls functions from these packages — it does not re-implement them.

### 3. Audio processing is server-side for heavy operations
Real-time pitch detection (pYIN, < 80ms latency) runs on-device via JS/WASM.
Heavy operations — vocal separation (Demucs), ASR (Whisper), and DTW comparison — run server-side via the audio-processor service.

### 4. The audio-processor service is Python-first
The `services/audio-processor` package contains only TypeScript job contracts (the interface between Node.js API and the Python service). The actual Python implementation lives in a separate directory:
```
services/audio-processor/
├── src/           # TypeScript job contract types (used by API service)
├── python/        # FastAPI app + Demucs/Whisper/pYIN Python implementation
└── README.md      # Python setup and deployment instructions
```

### 5. Content schema is versioned
Exercise definitions are stored in the backend database but described by versioned schemas in `packages/content-schema`. Exercise IDs include a version number. Never change an existing exercise's behavior — create a new version.

### 6. Package naming convention
All packages use the `@voice/` scope:
- `@voice/shared-types`
- `@voice/exercise-engine`
- `@voice/coaching-rules`
- `@voice/audio-metrics`
- `@voice/speaking-metrics`
- `@voice/curriculum`
- `@voice/content-schema`
- `@voice/karaoke-engine`
- `@voice/reward-engine`
- `@voice/avatar-state`
- `@voice/ui-tokens`

---

## Data flow overview

### Speaking session (real-time)
```
Mobile mic → PCM frames → JS VAD + pYIN (F0)
                                 ↓
                         LiveSpeakingFrame stream
                                 ↓
                   exercise-engine (session state machine)
                                 ↓
                      speaking-metrics (score computation)
                                 ↓
                      coaching-rules (feedback generation)
                                 ↓
                      avatar-state (dialogue + animation)
                                 ↓
              POST /v1/sessions/{id}/attempts → API → Supabase
```

### Singing session (real-time)
```
Mobile mic → PCM frames → JS pYIN (Hz → cents)
                                 ↓
                         LivePitchFrame stream
                                 ↓
                   exercise-engine (session state machine)
                                 ↓
                       audio-metrics (score computation)
                                 ↓
                      coaching-rules (feedback generation)
                                 ↓
                      avatar-state (dialogue + animation)
                                 ↓
              POST /v1/sessions/{id}/attempts → API → Supabase
```

### Karaoke session (Phase 2)
```
User selects song
       ↓
API → audio-processor job queue (Redis)
       ↓
Python: Demucs separation → pYIN analysis → store in Supabase
       ↓
Mobile: streams instrumental from Supabase Storage
       ↓
User records attempt over instrumental
       ↓
Mobile → POST /v1/karaoke/attempts → API → audio-processor job
       ↓
Python: DTW comparison → scores → coaching payload
       ↓
Mobile receives KaraokeAttemptScore → karaoke-engine → avatar dialogue
```

---

## Build targets

| Target | Command | Description |
|---|---|---|
| Mobile dev | `pnpm dev` | Starts Expo dev server |
| Type check all | `pnpm typecheck` | Runs tsc --noEmit across all packages |
| Build all packages | `pnpm build` | Compiles all shared packages |
| Test all | `pnpm test` | Runs Jest across all packages |
| Filter to package | `pnpm --filter @voice/reward-engine test` | Run tests in one package |
