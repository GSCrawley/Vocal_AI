🎯 **What:** Extracted the duplicated `scoreToBand` function from both `karaoke-engine` and `speaking-metrics` into the shared package `@voice/shared-types`.
💡 **Why:** It eliminates code duplication for a pure utility function. By centralizing it next to the `SuccessBand` type definition in `shared-types`, we improve readability, testability, and future maintainability if scoring thresholds change.
✅ **Verification:**
- Ran `pnpm typecheck`, `pnpm build`, `pnpm test` successfully across the workspace.
- Specific packages (`@voice/karaoke-engine`, `@voice/speaking-metrics`, `@voice/shared-types`) tested cleanly.
- Updated the Jest configuration in `speaking-metrics` to ensure ES Modules load `shared-types` safely during tests.
✨ **Result:** Both `karaoke-engine` and `speaking-metrics` now import `scoreToBand` natively from the shared utilities package, maintaining consistent behavior with reduced code footprint.
