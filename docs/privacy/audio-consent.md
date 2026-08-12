# Audio Storage Consent

## Invariant

Audio storage is strictly **opt-in**. The default state is OFF.

## Semantics

1. **Default Behavior (no storage):** By default, the app may transmit audio to our backend for transient processing (e.g., pitch extraction), but recordings are not persisted unless the user opts in.
2. **Deep Analysis (storage required):** To provide "deep analysis" (which relies on server-side python tools), the user's audio must be uploaded and stored, which requires explicit consent.
3. **Prompt:** The first time a user completes an attempt while the toggle is off, they will receive a one-time prompt explaining that deep analysis requires uploading their recording, and asking if they want to enable it.
4. **Settings:** The user can toggle audio storage consent at any time in the app settings.
5. **Fallback:** If consent is not granted, deep-analysis fields on the response are null. The coaching tip falls back to the existing rule set.

## Persistence

Consent is persisted as a boolean flag (`audioStorageConsent`) on the `UserProfile` object in the API.
