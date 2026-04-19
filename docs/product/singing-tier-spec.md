# VOICE — Singing Tier Specification

## Overview

The Singing Tier trains the musical voice: pitch, range, breath control, tone, dynamics, style, and the ability to sing songs the user loves. It is the more technically complex of the two tiers, requiring real-time pitch detection, interval analysis, melody comparison, and eventually style-specific coaching.

The Singing Tier's keystone feature — and the one that most distinguishes VOICE from existing apps — is **Karaoke Mode**: the educational practice of singing over a song the user cares about, guided by the AI toward sounding closer to the original artist.

---

## User personas

### The Bathroom Singer
Sings alone for fun but wants to stop sounding flat. Has no formal training. Wants quick wins and a sense of progress. Gets easily discouraged if tools feel like a grader.

**Key goals**: Pitch accuracy, basic breath support, confidence building.

### The Song Learner
Has a specific song (or five) they want to be able to sing well. Not interested in abstract exercises — wants to learn this song. Motivated by visible progress toward a concrete goal.

**Key goals**: Karaoke Mode, pitch accuracy on specific melodies, phrasing.

### The Hobbyist Vocalist
Sings regularly — in a choir, a band, or at open mics. Has some training but specific gaps. May want to extend range, develop vibrato, or add a new style.

**Key goals**: Range extension, vibrato development, style-specific technique.

### The Aspiring Performer
Takes singing seriously. Wants to understand their voice as an instrument. Interested in advanced technique, style differentiation, and measurable progress toward real performance.

**Key goals**: Full curriculum, style packs, portfolio of best takes.

### The Style Experimenter
An existing singer who wants to try something new — a metalhead who wants to learn opera, a pop singer who wants to try jazz. Motivated by variety and novelty.

**Key goals**: Style packs, style contrast exercises.

---

## Technical metrics

The Singing Tier builds on the audio-metrics package with expanded measurement:

### 1. Pitch Accuracy
- Algorithm: pYIN (probabilistic YIN)
- Output: frequency in Hz, converted to cents from target note
- Target tolerance: ±25 cents for MVP; narrowing to ±15 cents as skill increases
- Score: proportion of voiced frames within tolerance band + median cents error

### 2. Pitch Stability
- Rolling standard deviation of cents error during a sustained note or phrase
- Drift detection: slope of pitch curve over a hold (is the note drifting sharp or flat over time?)
- Score: inverse of std dev, normalized to 0–100

### 3. Onset Accuracy
- Time-to-lock: ms from phrase start to first frame within tolerance band
- Faster onset = higher competence signal ("find it quickly")
- Score: normalized time-to-lock vs target

### 4. Range
- Highest and lowest notes the user can sustain for > 1 second within ±50 cents
- Tracked over time to show expansion
- Comfortable range vs maximum range are tracked separately

### 5. Breath Control / Dynamics
- RMS envelope over a sustained note or phrase
- Variance = breath support quality (low variance = steady support)
- Phase 2: crescendo/decrescendo control (intentional dynamics)

### 6. Vibrato (Phase 2)
- Vibrato rate: oscillations per second (target: 5–7 Hz for most classical/pop styles)
- Vibrato width: cents deviation above/below center pitch (target: ±50 cents)
- Natural onset: vibrato should emerge naturally after note onset, not forced immediately

### 7. Breath/Noise Proxy — CPP (Phase 2)
- Cepstral Peak Prominence: correlates with voice quality and breathiness
- High CPP = cleaner phonation; low CPP = breathy or dysphonic
- Used as a training signal, never as a medical assessment

### 8. Vowel/Formant Consistency (Phase 3)
- F1/F2 formant stability during sustained vowels
- Used for style coaching (e.g., "open your vowels for classical" vs "compress for pop")

### 9. Style Markers (Phase 3)
- Style-specific acoustic patterns detected and scored:
  - Jazz: blue note intonation (intentional micro-flat on certain intervals), swing phrasing, vibrato on final notes
  - Opera: full vibrato, high CPP, specific formant tuning ("singer's formant" around 2.5–3kHz)
  - Blues: vocal slides and bends, expressive pitch deviation, HNR variation for grit
  - Metal: distortion safety (CPP drops are expected but flagged if extreme), power/screaming technique
  - Grindcore: extreme vocal technique (full safety framing required)

---

## Scoring taxonomy

**Pitch score (0–100)**
- 60% time-in-tolerance, 40% median cents error (lower = better)

**Stability score (0–100)**
- Inverse of pitch std dev during sustained windows; penalizes drift

**Onset score (0–100)**
- Normalized time-to-lock; rewards fast entry into tolerance band

**Overall score**: Initially 60% pitch / 40% stability. Onset bonus (up to +5 pts) for fast onsets.

**Karaoke match score** (Karaoke Mode, Phase 2)
- Pitch similarity: DTW (Dynamic Time Warping) comparison of user pitch curve vs original
- Timing accuracy: phrase onset alignment
- Phrasing: gross shape matching of the melody contour

---

## Exercise library

### Foundational exercises

**Breathing Foundation**
- Inhale through nose (4 counts), expand belly; exhale on "sss" (8 counts)
- Metric: breath duration and steadiness of exhale
- Purpose: diaphragmatic breathing is the foundation of singing support

**Straw Phonation (SOVT warm-up)** (Phase 2)
- Sing scales through a stirring straw — semi-occluded vocal tract
- Reduces vocal fold impact; warms up efficiently
- Metric: pitch accuracy through the straw; voicing continuity
- Evidence: SOVT exercises have strong clinical voice science support (Titze)

**Reference Tone Match**
- Avatar plays a note; user matches it and holds for 3 seconds
- Metric: pitch accuracy + stability
- Purpose: pitch matching is the most fundamental singing skill

**Sustained Hold**
- Hold a target note for 5–10 seconds; avatar shows real-time pitch trace
- Metric: stability score, drift detection
- Purpose: builds pitch stability and breath support simultaneously
- This is the Build 0.2 core exercise

**The Scale Walk**
- Sing a 5-note ascending scale (C–D–E–F–G) then descending, on "ah"
- Metric: pitch accuracy on each note, transition smoothness
- Purpose: interval awareness + basic agility

**The Octave Jump**
- Sing from a comfortable low note to its octave above, and back
- Metric: pitch accuracy on both notes, onset speed on the jump
- Purpose: early range work; identifies the break/passaggio

### Intermediate exercises

**Interval Training**
- Avatar plays a starting note; user sings an interval above/below (major 3rd, 5th, octave, etc.)
- Metric: pitch accuracy on the interval target
- Purpose: ear training + pitch control across leaps

**The Phrase Hold**
- Sing a 3–4 note phrase from a real song snippet; hold the final note
- Metric: phrase pitch accuracy + sustained note stability
- Purpose: bridges exercise practice to real musical context

**Passaggio Navigation**
- Exercises that deliberately cross the user's vocal break (chest-to-head voice transition)
- The avatar identifies where the break occurs and designs exercises that smooth it
- Metric: pitch continuity through the break; stability on either side

**Dynamic Control**
- Sing a sustained note starting softly and crescendo to full volume, then decrescendo
- Metric: pitch stability during volume changes (a common difficulty)
- Purpose: independent control of pitch and volume

**Vibrato Introduction** (Phase 2)
- Guided exercises for developing natural vibrato through breath oscillation
- Metric: vibrato rate and width
- Not forced — only introduced when the user has stable straight-tone first

### Advanced exercises (Phase 2+)

**Style-Specific Phrases**
- Excerpts from real songs in a target style; user sings them with style coaching
- Metal: distortion onset, placement cues for head voice screaming
- Jazz: blue note intonation, swing phrasing, half-step approach notes
- Opera: breath management for long phrases, vowel shaping, vibrato maintenance
- Blues: slide and bend technique, expressive pitch deviation targeting

**Range Extension Program**
- Progressive exercises that push comfortable range incrementally (by semitone)
- Never pushes to strain; safety monitoring via strain-risk proxy (high SPL + unstable phonation)
- Target: expand comfortable range by 1–3 semitones per month with consistent practice

---

## Curriculum structure

### Level 1 — Foundation (0–15 sessions)
- Breathing and support
- Pitch matching (sustained reference tones)
- Sustained holds in comfortable range
- Basic scale exercises
- First range assessment

### Level 2 — Core Skills (15–40 sessions)
- Scale work (5-note and full octave)
- Stability training
- Octave jumps and interval awareness
- Dynamic introduction
- First song snippet attempts (Karaoke Mode introduction)

### Level 3 — Musicality (40–80 sessions)
- Passaggio navigation
- Phrase singing with pitch and timing
- Dynamic control exercises
- Style introductions
- Range extension program begins

### Level 4 — Expression and Style (80+ sessions)
- Style pack access
- Advanced interval and phrase work
- Vibrato development
- Extended song practice (Karaoke Mode full songs)
- Best-take portfolio

---

## Style packs — design approach

Each style pack is a module containing:
- A brief audio introduction from the avatar explaining the style's vocal characteristics
- 3–5 style-specific exercises ordered from diagnostic to advanced
- A set of 10–20 curated songs appropriate to the style for Karaoke Mode practice
- Style-specific feedback templates (the avatar's language changes to reflect the style's culture)
- Unlocked after Level 3

**Style pack examples**:

*Jazz pack*: Exercises focus on blue note intonation, vibrato on final notes, bebop phrasing. Avatar adopts a jazz-appropriate conversational register. Songs: standards, contemporary jazz pop.

*Opera pack*: Exercises focus on vowel shaping (Italian open vowels), breath management for long phrases, vibrato maintenance, singer's formant development. Avatar adopts a classical pedagogy register. Songs: arias (simplified), operatic excerpts.

*Heavy Metal pack*: Exercises cover placement safety for distorted techniques, head voice power, extended range. Safety framing is prominent — "this style can be done safely, but it requires technique." Avatar acknowledges the style respectfully without sanitizing it. Songs: metal anthems, power metal melodies.

*Grindcore pack*: Extreme vocal technique (vocal fry extension, false cord distortion). Full safety framing throughout — this style has the highest risk of vocal injury if done incorrectly. Exercises are introduced slowly, with frequent check-ins on vocal health. The avatar here is notably more safety-conservative.

---

## Vocal safety — Singing Tier

- **No range pushing in early levels**: comfortable tessitura only until Level 2
- **Strain-risk proxy**: high SPL + high F0 + unstable phonation = flag + ease-first suggestion
- **CPP monitoring** (Phase 2): significant CPP drops mid-session flag possible vocal fatigue
- **Pain/hoarseness stop cue**: any user-reported pain → stop immediately, rest, suggest professional evaluation if persistent
- **Grindcore/extreme technique**: additional safety layer; exercises locked until user acknowledges technique risk
- **Vocal rest reminder**: after sessions > 30 minutes, prompt the user to rest their voice for at least the rest of the day
