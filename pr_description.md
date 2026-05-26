## Description
Implement the Build 0.1 Sustained Note audio-metrics and exercise-engine requirements. Both packages have been written with strict types, functional principles, and deterministic tests as requested by the brief.

### Acceptance Criteria Satisfied:
- [x] Pitch scoring is deterministic and tested.
- [x] Low-confidence or noisy input routes through mic-check or returns degradedScore.
- [x] Invalid state transitions are rejected.
- [x] Live feedback target remains under the documented 80ms latency budget (microbenchmark shows processing 500 frames takes < 5ms).
- [x] Build 0.1 sustained-note loop can be represented end-to-end (integration test verifies transition path to completion and XP).
- [x] pnpm typecheck passes across all workspace projects.
- [x] No duplicate types in packages (domain types correctly placed in `@voice/shared-types`).

### Shared Types Updates
Added `MicCheckResult`, `ScoringWeights`, `SustainedNoteTarget`, `MicCheckOpts`, `AttemptResult`, `SingingScore`, `UserSessionContext`, and `CurriculumEntry` directly to `@voice/shared-types`. I also added `rmsDb` and `noiseFloorDb` optional properties to `LivePitchFrame` to support mic checks.

### Conflict Notes
The brief states `scorePitchStability(frames: PitchFrame[]): number`, but to correctly score stability without recalculating targets, we either assume stability is relative to the median pitch or need a target. I decided to calculate wobble around the median frequency of valid frames to remain pure to the function signature requested. For `scoreCompletion`, it only aggregates time for frames where pitch is within tolerance of the target, successfully catching off-key attempts.

### Design Choices
- **Stability variance mapping:** Stability maps the Standard Deviation of Cents error: `1 - (stdDev / 100)`, clamped between 0 and 1. This means 0 standard deviation yields a perfect 1.0, while 100+ cent wobble yields 0.
- **Mic check thresholds:** The default check relies on the ratio of valid frames `(voiced && confidence >= 0.5)` needing to be at least `0.3`. It also fails if `rmsDb` climbs above `-1` (clipping) or `noiseFloorDb` is above `-20` (too noisy).
