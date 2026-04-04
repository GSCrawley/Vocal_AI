# Vocal AI

Vocal AI is a mobile-first vocal training platform focused on helping users improve core singing fundamentals through guided practice, real-time feedback, and measurable progress.

## Repository layout

- `apps/mobile` — cross-platform user app
- `apps/admin` — internal content and operations tooling
- `services/api` — backend API
- `services/analytics-worker` — background aggregations and summaries
- `services/notification-worker` — reminder and notification orchestration
- `packages/shared-types` — shared domain contracts
- `packages/exercise-engine` — session and exercise orchestration logic
- `packages/coaching-rules` — scoring-to-feedback mapping
- `packages/audio-metrics` — metric contracts and score helpers
- `packages/content-schema` — versioned schema contracts for exercises and plans
- `packages/ui-tokens` — shared UI tokens
- `docs/architecture` — system notes
- `docs/api` — API notes
- `docs/product` — product implementation notes
- `docs/qa` — QA notes

## First implementation target

Build 0.1 should prove one narrow loop end to end:

1. microphone permission
2. mic check
3. one sustained-note exercise
4. live pitch guidance
5. post-exercise score and plain-language coaching tip
