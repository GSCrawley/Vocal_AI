# VOICE — Speaking Tier Specification

## Overview

The Speaking Tier trains the non-singing voice: public speaking, professional communication, media presence, and everyday vocal authority. Users in this tier want to sound more confident, more engaging, more credible, or simply clearer.

The challenge that distinguishes speaking from singing coaching is that speaking quality is more subjective and context-dependent — a voice that works for a podcast sounds different from one that commands a boardroom. The curriculum handles this through **specialization tracks** (Phase 2+), but the foundational skills apply across all speaking contexts.

---

## User personas

### The Presenter
A professional who gives talks — conferences, TED-style events, all-hands meetings. Their problem: they sound nervous or monotone when presenting, even though they know their material. They want vocal variety, confident pacing, and the ability to pause for effect without feeling awkward.

**Key goals**: Pitch variability, pace control, pause mastery, projection.

### The Podcaster
An audio creator who knows their voice is their brand. They've listened back to their episodes and noticed they sound flat, or fast, or breathy, or they say "um" too much. They want a richer, more consistent sound.

**Key goals**: Resonance, filler reduction, energy consistency, mic technique awareness.

### The Creator (Social Media / Influencer)
Short-form video requires a voice that hooks in the first 2 seconds. Their delivery needs energy, clarity, and authenticity — all at once. Speaking too fast loses the audience; too slow loses the algorithm.

**Key goals**: Energetic delivery, hook practice, pace for short-form, vocal presence.

### The Authority Figure (Executive / Teacher)
Someone who speaks to groups daily and wants their voice to carry natural authority. They may have been told they sound uncertain, or that their voice doesn't carry in a room, or that they trail off at the end of sentences.

**Key goals**: Downward inflection (avoiding uptalk), projection, resonance, sentence-final pitch drops.

### The Job Seeker
Someone preparing for interviews who wants to sound composed and confident under pressure. Nervousness shows up as rushed pace, rising intonation, and filler words.

**Key goals**: Pace control, confident delivery, filler reduction, pause comfort.

---

## Technical metrics

Speaking analysis uses a different measurement stack from singing. The core measurements are:

### 1. Fundamental Frequency (F0) — Speaking Range
Same pYIN algorithm as the Singing Tier, tuned for speech ranges:
- Male speech: 85–180 Hz (typical)
- Female speech: 165–255 Hz (typical)
- Target metrics: mean F0, F0 range (expressiveness), F0 slope at sentence ends (uptalk detection)

**Uptalk detection**: If median F0 at phrase endings is rising, flag as uptalk. Downward inflection (authority marker) is when F0 drops 10–20 Hz in the last 300ms of a clause.

### 2. Speaking Rate
- Words per minute (WPM) — estimated from VAD segment duration + expected word density
- Target ranges by context:
  - Conversational: 140–180 WPM
  - Presentation: 130–160 WPM
  - Short-form video: 150–190 WPM
  - Technical explanation: 110–140 WPM
- Articulation rate (excluding pauses) vs overall rate

### 3. Pause Analysis
- Pause frequency (pauses per minute)
- Pause duration distribution (too short = rushed; too long = hesitant)
- Pause placement (before key words = good; mid-phrase = choppy)
- Target: 3–5 meaningful pauses per minute in presentations

### 4. Intensity / Dynamics
- Mean RMS level (projection — is the user loud enough?)
- RMS variation (dynamic range — are they changing volume for emphasis?)
- Onset/offset patterns (are they fading at end of sentences?)

### 5. Harmonics-to-Noise Ratio (HNR)
Proxy for voice clarity and breathiness. Higher HNR = cleaner, clearer voice. Low HNR + high intensity = possible strain. Low HNR + low intensity = breathy/weak.

### 6. Resonance (Phase 2)
- Spectral tilt: ratio of energy in low frequencies (chest resonance) vs high (thin/nasal)
- Chest resonance is associated with perceived authority and warmth
- Measured via LPC spectral envelope analysis

### 7. Filler Word Detection
- Target fillers: "um", "uh", "like", "you know", "so", "basically", "literally", "right?"
- MVP: post-recording analysis via cloud ASR (Deepgram/Whisper)
- Phase 2: near-real-time detection with on-device Whisper tiny model
- Output: filler count, filler rate (per minute), timeline of filler occurrences

### 8. Articulation / Clarity (Phase 3)
- Consonant precision is difficult to measure without phoneme-level ASR
- Phase 3 approach: use ASR word confidence scores as a proxy for clarity — low confidence = unclear articulation

---

## Scoring taxonomy

For the Speaking Tier, scores map to the user's goal context:

**Pace score (0–100)**
- 100 = within target WPM range with appropriate pauses
- Penalty: too fast, too slow, or irregular rhythm without intentional variation

**Prosody score (0–100)**
- 100 = healthy F0 range with appropriate intonation patterns; no uptalk
- Penalty: monotone (< 20Hz F0 range), consistent uptalk, flat ending cadences

**Projection score (0–100)**
- 100 = consistent RMS above target threshold with dynamic variation
- Penalty: too quiet, fading at sentence ends, no dynamic range

**Filler score (0–100)**
- 100 = < 2 fillers per minute
- Penalty: proportional to filler rate

**Overall score**: weighted by user's stated focus. If the user is working on pace, pace score is weighted 60%; other scores contribute less.

---

## Exercise library

### Foundational exercises (all users)

**Diaphragmatic Breathing**
- Instructions: inhale for 4 counts, hold 2, exhale on voiced "shhh" for 8 counts
- Metric: breath duration and evenness
- Purpose: foundation for all vocal work

**Resonance Hum**
- Instructions: hum at a comfortable pitch, focusing on chest resonance (feel the vibration)
- Metric: spectral tilt (chest energy ratio)
- Purpose: teaches chest placement; warms up resonators

**The Slow Read**
- Instructions: read a provided passage at a deliberately slow pace (target: 110 WPM)
- Metric: WPM accuracy, pause frequency
- Purpose: breaks the rushing habit; builds pause comfort

**The Pause Practice**
- Instructions: read a marked-up passage; pause at every comma and period for a full beat
- Metric: pause duration at marked points
- Purpose: intentional pause as a rhetorical tool

**The Power Sentence**
- Instructions: say the same sentence three ways — as a question, as a statement, as a command
- Metric: F0 contour comparison across takes
- Purpose: teaches the user how intonation changes meaning

### Intermediate exercises

**The Monotone Breaker**
- Instructions: read a passage while tracking the live pitch line — keep the pitch line moving (no flat sections longer than 2 seconds)
- Metric: F0 range, proportion of voiced frames with < 5Hz variation
- Purpose: breaks ingrained monotone patterns

**The Filler Audit**
- Instructions: speak for 90 seconds on a given topic (or freestyle)
- Metric: post-analysis filler count and timeline
- Purpose: first step in filler reduction — awareness precedes change

**The Energy Staircase**
- Instructions: say a sentence at 50% energy, then 75%, then 100% — three takes, no strain
- Metric: RMS levels across takes
- Purpose: teaches dynamic range intentionally

**The Authority Close**
- Instructions: end each sentence with a deliberate downward pitch drop of at least 15Hz in the last 300ms
- Metric: sentence-final F0 slope detection
- Purpose: eliminates uptalk; builds perceived authority

**The 30-Second Hook**
- Instructions: record a 30-second opener for a talk, podcast, or video
- Metric: pace, energy, filler count, engagement markers
- Purpose: practices the highest-leverage 30 seconds in any communication

### Advanced exercises (Phase 2)

**The Long-Form Stamina Run**
- 5-minute continuous speaking exercise with live pace and energy monitoring
- Detects energy drop-off (fatigue) and coaches breath support

**Interview Simulation**
- Avatar asks a question; user responds (60 seconds); AI scores pace, filler, confidence markers
- Builds comfort with unscripted, pressure-context speaking

**The Style Contrast**
- Same content delivered in two styles (e.g., conversational vs formal)
- AI identifies which elements actually changed and gives a similarity/differentiation score

---

## Curriculum structure

### Level 1 — Foundation (0–10 sessions)
Goal: establish baseline measurements; build the user's awareness of their own speaking patterns; create first wins

Sessions focus on:
1. Baseline assessment (pace, prosody, resonance, filler)
2. Breathing and resonance fundamentals
3. Pace awareness (reading at target WPM)
4. Pause introduction
5. First filler audit

### Level 2 — Control (10–30 sessions)
Goal: user gains conscious control of pace, pause, and basic prosody

Sessions focus on:
- The Slow Read and Pause Practice (progressive difficulty)
- Monotone Breaker
- Authority Close introduction
- First recordings for self-comparison

### Level 3 — Expression (30–60 sessions)
Goal: user can vary delivery intentionally; first specialization choices

Sessions focus on:
- The Energy Staircase
- Filler reduction drills
- The 30-Second Hook
- Specialization track selection (Presenter / Podcaster / Creator / Authority)

### Level 4 — Mastery (60+ sessions)
Goal: consistent high-quality delivery in challenging conditions; style fluency

Sessions focus on:
- Long-form stamina
- Interview simulation
- Style contrast
- Recording portfolio building

---

## Speaking Tier — Avatar coaching language

The avatar's Speaking Tier persona is slightly different from the Singing Tier persona. For speaking, the coach should feel like a trusted communications coach or speechwriting collaborator — warm but direct, focused on the user's goals in the real world.

**Key language principles**:
- Reference the user's stated context ("As someone preparing for interviews, this next exercise is especially relevant")
- Normalize the difficulty ("Everyone speaks faster when they're nervous — we're going to train the habit out")
- Use precise feedback ("Your WPM was 187 — that's about 30 words per minute faster than your target. Let's slow it down")
- Connect skills to real outcomes ("A 2-second pause here would double the impact of that sentence")

**Prohibited language patterns**:
- "You need to..." (prescriptive, autonomy-violating)
- "That was bad" or "Wrong" (shame-inducing)
- Vague praise: "Nice job" without a specific success
- Overwhelming lists: "You were too fast, too monotone, used filler words, and faded at the end" — one correction only

---

## Vocal safety notes

Speaking coaching has different safety considerations from singing:

- **Vocal fatigue**: Long speaking sessions without rest can cause hoarseness. Sessions over 20 minutes should include a check-in ("How does your voice feel?")
- **Projection without strain**: Teaching projection should emphasize breath support and resonance, NOT pushing or squeezing. If HNR drops sharply during high-intensity exercises, the avatar should suggest softer delivery
- **Screaming / shouting**: VOICE does not train screaming or shouting in the Speaking Tier. High SPL + unstable phonation patterns trigger a stop cue
- **Persistent hoarseness**: If a user reports pain or worsening hoarseness on any session, surface a stop-and-rest message and recommend professional evaluation if it persists beyond 48 hours
