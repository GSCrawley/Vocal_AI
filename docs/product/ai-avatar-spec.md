# VOICE — AI Avatar Specification

## The coach as character

The VOICE avatar is not a chatbot inside a mascot costume. It is a character — a voice coach with a personality, a point of view, and a consistent way of relating to the user. The product experience lives or dies on how much the user trusts and likes working with their coach.

The avatar exists to solve one of the hardest problems in solo learning: **the feeling of being coached alone is inherently lonely and unmotivating**. The avatar replaces that gap with something that approximates the rapport, structure, and warmth of a real coaching relationship — without pretending to be human.

---

## Character identity

**Name**: To be determined by brand team. Working name: **VOCA** (gender-neutral, rhythmically clean).

**Visual style**: Animated character — stylized but not cartoonish. Think somewhere between the warmth of Duolingo's owl and the design polish of a Sony or Apple product character. The character should feel friendly but not infantilizing. An adult using VOICE for a job interview or a TED talk should not feel embarrassed by their coach.

**Design principles**:
- Simple, high-quality 2D animation (Lottie-based)
- Expressive face with large eyes for emotional readability
- No mouth animation for MVP (too complex); introduce in Phase 2
- Color palette tied to the active tier: Speaking Tier = warm amber/gold tones; Singing Tier = cool blue/violet tones
- The avatar physically "listens" during recording (animated lean-in, visual attention cue)
- The avatar "celebrates" with a distinct animation distinct from "coaching" — users should be able to tell from glance whether they're being praised or corrected

---

## Behavioral states

The avatar has six primary behavioral states, each with a corresponding Lottie animation and dialogue mode:

### 1. IDLE
The avatar waits, gently animated (subtle breathing, occasional look around). No coaching happening yet. Shown on home screen, between exercises, on loading screens.
- Animation: slow loop, minimal movement
- No dialogue unless the user has been inactive for > 3 minutes (then: gentle prompt)

### 2. INTRO / EXPLAINING
The avatar is introducing an exercise or a concept. Stands in a "teaching" pose, gestures open.
- Animation: upright, gestural, attentive
- Dialogue: exercise instructions, motivational framing, context-setting
- Voice: measured, clear, warm

### 3. LISTENING
The avatar is listening to the user perform. This is the most important behavioral state — it signals to the user that their voice is being heard and analyzed.
- Animation: leaned forward slightly, subtle "hearing" gesture (hand near ear or simple attentive posture)
- No dialogue during this state — silence reinforces focus
- Live pitch meter/waveform displayed as primary UI; avatar is secondary

### 4. ANALYZING
Brief state between recording end and result display. 1–2 seconds.
- Animation: thoughtful expression, slight pause
- Optionally: short processing sound effect
- This state should feel intentional, not like a loading spinner

### 5. COACHING
The avatar is giving feedback — either the dominant correction after a result, or an in-session cue.
- Animation: engaged, slightly forward, direct eye contact
- Dialogue: one specific correction or tip (never more than two sentences)
- This is the state where the avatar's language quality matters most

### 6. CELEBRATING
The avatar explicitly celebrates a success — a new personal best, a completed snippet, a badge unlock, a streak milestone.
- Animation: distinct, high-energy celebration (not used for routine "good job" moments — reserved for genuine milestones)
- Dialogue: specific, precise praise ("You just held within ±15 cents for 5.8 seconds — that's your longest clean hold yet")
- This state should feel earned, not participation-trophy

---

## Dialogue system

### Dialogue generation approach

**Two-layer system** (consistent with the coaching philosophy's "deterministic first" principle):

**Layer 1 — Deterministic templates**:
All core coaching messages (exercise intros, score interpretations, correction cues, reflection prompts) are written by human writers and stored as structured templates in the content database. Variables are filled at runtime (score values, specific note names, session context).

Templates are organized by:
- Tier (Speaking / Singing)
- Exercise type
- Feedback type (praise / correction / instruction)
- Success band (excellent / good / developing / retry)
- User's session count (different language for session 1 vs session 50)

**Layer 2 — LLM personalization** (opt-in, low-risk):
An LLM (Claude API, server-side) can be called to rewrite deterministic coaching messages in a more natural, contextually-aware voice — drawing on the user's history, their stated goal, and recent session data. This should never fabricate metric claims — only the framing is personalized.

Example:
- Deterministic: "You drifted flat by about 30 cents in the second half of the hold. Focus on steadier breath support."
- LLM-personalized: "That drift in the second half is familiar — you've been working on that exact thing. You're getting closer each time. Same steady breath, one more try."

LLM personalization is logged and audited to ensure quality.

### Dialogue principles

1. **Specific > vague** always. "You held within ±20 cents for 3.2 seconds" beats "Nice work."
2. **One correction** per session attempt. Never stack corrections.
3. **Agency language**: "Want to try again?" not "You need to try again." "You can move on or take another pass." not "You should move on."
4. **No shame**: no language that implies the user failed, disappointed the avatar, or wasted time.
5. **Continuity**: avatar references the user's session history where possible. "Last time you worked on X — let's see how that's feeling today."
6. **Emotional range**: the avatar's language matches the moment. After a personal best, it should feel genuinely excited. After a tough session, it should be warmer and quieter.

### Dialogue examples by state

**INTRO (Singing Tier, Sustained Hold exercise)**
> "Okay — we're going to hold a note today. I'll play you the target pitch first, then you'll match it and hold it as steady as you can. Don't worry about perfect — just find the note and breathe into it. Ready when you are."

**INTRO (Speaking Tier, The Slow Read exercise)**
> "This one is harder than it sounds: I want you to read this passage slower than feels comfortable. Aim for 110 words per minute. Most people speak fast because they're nervous — we're going to train your nervous system to trust the pause. Take a breath and start when ready."

**COACHING (Singing, correction, developing band)**
> "You drifted sharp about halfway through — your breath probably got lighter right there. This time, keep the same breath pressure through the whole hold. Don't back off. Go again."

**COACHING (Speaking, pace correction)**
> "You came in at 192 words per minute — that's about 50 faster than your target. The ideas are clear; your voice just needs to let them breathe. Try it again, and this time, land on every period before moving on."

**CELEBRATING (new personal best — singing)**
> "That's a new personal best — 6.1 seconds in tolerance. That's the sound of your breath support improving. Really good."

**REFLECTION PROMPTS (end of session)**
> "Two quick questions before you go. First: what felt easiest in today's session?"  
> [user selects from options]  
> "And what will you focus on next time you practice?"

---

## Avatar tonal personas by tier

The avatar's underlying personality is consistent, but its register shifts slightly between tiers:

**Speaking Tier persona**: Warm, direct, communications-professional energy. Like a trusted speech coach or executive communications mentor — no-nonsense but supportive. Uses real-world framing frequently ("in an interview," "when you're on stage").

**Singing Tier persona**: More playful, more emotionally expressive, more music-specific vocabulary. Like a voice teacher who loves music and wants the student to love it too. Can be excited about a good take in a way that feels genuine, not corporate.

**Cross-tier consistency**: The avatar always respects the user's intelligence. Never patronizing. Always treats the user as someone capable of improvement.

---

## Technical implementation

### Animation runtime
- **Lottie** (via `lottie-react-native`) for MVP
- Each behavioral state = one Lottie animation file
- State transitions: instant cut for LISTENING → ANALYZING; cross-fade for IDLE → INTRO; pop for CELEBRATING
- Animation files are bundled with the app (not fetched at runtime) for performance

### Voice output (Phase 2)
- Text-to-speech for avatar dialogue
- MVP: text-only (displayed as speech bubbles / caption panel)
- Phase 2: ElevenLabs or similar neural TTS with a custom trained voice for the avatar
- The avatar's voice should match its visual personality: warm, clear, mid-range, unhurried

### Avatar state machine (packages/avatar-state)
The avatar-state package manages transitions between behavioral states:
```
IDLE → INTRO (on session start)
INTRO → LISTENING (on exercise begin)
LISTENING → ANALYZING (on recording end)
ANALYZING → COACHING (on result ready, score < excellent)
ANALYZING → CELEBRATING (on personal best or milestone)
COACHING → LISTENING (on "try again")
COACHING → IDLE (on "move on" or session end)
CELEBRATING → IDLE or next INTRO
```

The state machine is reactive to:
- Session state from exercise-engine
- Score results from audio analysis
- Reward triggers from reward-engine

---

## Avatar customization (Phase 3)

Users can unlock cosmetic variations of the avatar via XP or achievements:
- Color palette variations (skin/hair tones, outfit colors)
- Accessory unlocks (headphones, microphone, musical notes in the background)
- Celebration animation variations

Customization is cosmetic only — the coaching behavior never changes.
