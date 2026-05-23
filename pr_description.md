🎯 **What:** This branch replaces the hardcoded Sentry DSN in `apps/mobile/App.tsx` with the `EXPO_PUBLIC_SENTRY_DSN` environment variable.

⚠️ **Risk:** Hardcoding the DSN exposes it in the version control history and makes it accessible to anyone who can view the codebase. This can lead to unauthorized reporting, cluttering Sentry projects, and potentially exhausting event quotas.

🛡️ **Solution:** By injecting the DSN via an Expo public environment variable (`EXPO_PUBLIC_SENTRY_DSN`), the value is separated from the source code, allowing for distinct configuration across different environments (development, staging, production) and improving the overall security posture.
