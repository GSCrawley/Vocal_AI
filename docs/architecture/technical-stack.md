# VOICE — Technical Stack

## Framework decision: Expo (React Native)

### Why Expo

VOICE's core value lives in real-time audio interaction on a mobile device. The framework decision flows directly from that constraint.

**Expo is the recommended choice** for the following reasons:

- **Audio ecosystem**: `expo-av` handles recording, playback, and audio session management. `react-native-audio-api` (or `react-native-live-audio-stream`) gives access to raw PCM buffers for real-time pitch analysis. Both are well-maintained and actively used in production audio apps.
- **Cross-platform by default**: A single codebase ships to iOS and Android. This matters because vocal coaching is a personal, daily-use app — we want to reach both platforms without maintaining two codebases.
- **Over-the-air updates**: Expo's OTA update system (via EAS Update) lets us push coaching content, exercise definitions, and curriculum updates without App Store review cycles. This is critical for a product whose content will evolve rapidly.
- **Managed workflow flexibility**: Expo's managed workflow gets us started fast. When we need deep custom native modules (e.g., a WebAssembly pitch detector or a custom audio worklet), Expo supports bare workflow or config plugins without abandoning the ecosystem.
- **EAS Build**: Cloud-based build infrastructure for CI/CD without managing Mac build agents.

**Why not bare React Native**: More friction, more setup, no meaningful audio advantage for our use case.

**Why not Flutter**: Flutter's audio ecosystem is less mature for real-time DSP work. Switching would also abandon the TypeScript monorepo structure and all existing package work.

---

## Audio stack

### Recording and playback

| Capability | Library | Notes |
|---|---|---|
| Audio recording | `expo-av` | Handles permissions, session management, and file recording |
| Raw PCM streaming | `react-native-audio-api` | Provides access to Web Audio API–style processing; needed for live pitch tracking |
| Playback | `expo-av` | Handles both recorded audio and reference tones |
| Audio session config | `expo-av` (iOS) | Configures AVAudioSession for measurement mode |

### Pitch detection (singing tier)

**Algorithm: pYIN** (probabilistic YIN)

pYIN is the recommended algorithm because:
- YIN is a foundational F0 estimator with strong accuracy across vocal frequency ranges
- pYIN adds probabilistic candidates and Hidden Markov Model smoothing for more stable real-time tracking
- It handles voiced/unvoiced transitions gracefully, which is critical for singing feedback
- The algorithm is implementable in JavaScript (pitchy library uses YIN-family approach) or as a WebAssembly module compiled from C

**Implementation path**:
1. MVP: Use `pitchy` (JS YIN implementation) — fast enough for ~50ms frame updates
2. Phase 2: Compile pYIN to WASM for better latency and accuracy under load
3. Cents conversion: `cents = 1200 * log2(frequency / referenceFrequency)` where A4 = 440Hz

**Latency target**: < 80ms from voice onset to visual feedback update. At 80ms, feedback is perceptible but not disorienting — consistent with augmented feedback literature recommendations.

### Speaking analysis

Speaking metrics require a different set of algorithms from singing:

| Metric | Algorithm | Implementation |
|---|---|---|
| Fundamental frequency (F0) | pYIN (speech range: 85–255Hz) | Same pitch detector, different range params |
| Pitch variability / prosody | Rolling std dev of F0; intonation slope analysis | Custom DSP |
| Speaking rate (WPM) | Voice Activity Detection (VAD) + word count estimation | Silero VAD (WASM) |
| Pause detection | VAD + silence segmentation | Silero VAD |
| Intensity / dynamics | RMS energy envelope | Custom DSP |
| Harmonics-to-Noise Ratio | Autocorrelation method | Custom DSP |
| Filler word detection | On-device ASR | Whisper.cpp (tiny model, WASM) or cloud fallback |
| Resonance / spectral tilt | LPC spectral envelope analysis | Phase 2 |

**Filler word detection note**: On-device Whisper (tiny model) is ~39MB and runs at roughly real-time on modern mobile hardware. For MVP, a simpler approach is to use a cloud ASR endpoint (Deepgram or similar) post-recording for filler analysis, then display results on the result screen. Real-time filler detection is a Phase 2 goal.

---

## Vocal separation (Karaoke Mode)

Vocal separation is a server-side operation. On-device models are not yet reliable or fast enough for mobile.

**Recommended approach: Demucs (Meta, open source)**

- State-of-the-art source separation quality
- htdemucs model separates vocals, drums, bass, other
- Can run on CPU (slower) or GPU (recommended for production)
- Typical processing time: 2–5× real-time on CPU; near-real-time on GPU

**Pipeline**:
1. User selects a song in the app
2. App sends song title / artist to the API
3. API resolves the song via a licensed audio source or YouTube audio (per legal review)
4. Demucs processes the audio file server-side (async job)
5. API returns: instrumental track, isolated vocal track, vocal pitch/melody analysis
6. Instrumental track streams to the mobile app for practice
7. Vocal pitch data is used by the karaoke engine to set practice targets

**Legal considerations**: Vocal separation and local playback of copyrighted audio for private educational use falls under fair use in most jurisdictions, but this should be reviewed by legal counsel before launch. The API should not distribute the separated stems publicly.

---

## State management

**Zustand** is the recommended state management library.

- Lightweight (~1KB) and idiomatic with React
- No boilerplate (no reducers, no providers required)
- Works well with async audio state (recording status, pitch frames, scores)
- Supports middleware for persistence (via zustand/middleware persist) — needed for best-take storage
- Easy to split into domain slices: `useSessionStore`, `useUserStore`, `useAvatarStore`, `useRewardStore`

---

## Backend services

### API service (`services/api`)

**Runtime**: Node.js with TypeScript  
**Framework**: Fastify (lightweight, schema-first, excellent TypeScript support)  
**Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)

Supabase is recommended because:
- Managed Postgres with row-level security — right model for per-user training data
- Built-in auth (email, Google, Apple Sign-In) — critical for mobile
- Storage for audio files (best takes, processed instrumentals)
- No separate infrastructure for auth or file storage in the MVP

### Audio processor (`services/audio-processor`)

**Runtime**: Python (FastAPI)  
**Reason**: Python has the best ecosystem for audio ML (Demucs, librosa, crepe, openai-whisper). This service is separate from the Node.js API and handles async jobs.

- Demucs for vocal separation
- Crepe or pYIN (Python) for reference vocal pitch extraction
- Whisper for filler word analysis (batch mode)
- Jobs queued via Redis (BullMQ compatible pattern from Node side)

### Analytics worker (`services/analytics-worker`)

Background aggregations: weekly progress summaries, streak calculations, session statistics. Runs on a cron schedule.

### Notification worker (`services/notification-worker`)

Streak reminders, milestone celebrations, personalized practice suggestions. Integrates with Expo Push Notifications.

---

## Avatar rendering

**Lottie** (via `lottie-react-native`) for the animated mascot.

- Lottie animations are JSON-based, small, and designer-friendly
- Supports looping idle states, triggered reactions, and transition animations
- Works on both iOS and Android without native code changes
- The avatar animator can export different behavioral state animations (idle, coaching, celebrating, correcting, listening) as separate Lottie files

**React Native Skia** (Phase 2): For more advanced real-time avatar reactions that need to respond to live audio (e.g., mouth movement synced to AI speech output), Skia provides GPU-accelerated 2D rendering.

---

## Package manager

**pnpm** with workspaces (already configured in root `package.json` and `pnpm-workspace.yaml`).

Benefits for this monorepo:
- Single `node_modules` with symlinked packages — much faster installs
- Strict dependency isolation prevents accidental cross-package imports
- `--filter` flag for running commands in specific packages or apps

---

## Key development environment notes

- **TypeScript strict mode** across all packages
- **ESLint + Prettier** for code consistency
- **EAS Build** for CI/CD (iOS + Android)
- **Jest** for unit tests on all packages
- **Detox** (Phase 2) for end-to-end mobile testing
- All shared domain contracts live in `packages/shared-types` — never duplicate types between mobile and backend

---

## Dependency constraints

Audio processing on mobile has strict latency requirements. Key rules:

1. **Never block the main thread with DSP work.** Use Web Workers (via react-native-worker-threads) or offload to native.
2. **Buffer audio in fixed-size frames** (e.g., 2048 samples at 44.1kHz ≈ 46ms) before processing.
3. **Feedback must arrive within 80ms** of voice input for the pitch meter to feel responsive.
4. **Graceful degradation**: if the pitch tracker loses confidence (noisy room, clipping), surface a "too noisy" state rather than showing incorrect feedback.
