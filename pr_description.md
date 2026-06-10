🎯 **What:** The code health issue addressed
Replaced the `any` types for `req` and `res` in the HTTP server creation (`createServer`) with proper strong types (`IncomingMessage` and `ServerResponse`) in `services/notification-worker/src/index.ts`. Used underscore prefixes (`_req`, `_res`) to satisfy the `no-unused-vars` linting rule.

💡 **Why:** How this improves maintainability
Using `any` undermines TypeScript's type safety. Replacing it with explicit HTTP types improves the readability of the code by clearly declaring intent, preventing potential runtime errors if the parameters are used in the future, and making the code more strictly typed.

✅ **Verification:** How you confirmed the change is safe
- Ran `pnpm --filter "@voice/notification-worker" run lint` and the root `pnpm run lint` which successfully completed without any errors related to this file.
- Ran `pnpm --filter "@voice/notification-worker" run typecheck` which compiled successfully.
- Executed tests for the worker (`pnpm --filter "@voice/notification-worker" run test`), which passed perfectly.
- Verified that all workspace tests and Prettier check (`pnpm format:check`) also pass correctly.

✨ **Result:** The improvement achieved
Eliminated the use of `any` in `services/notification-worker/src/index.ts` maintaining code quality without breaking functionality.
