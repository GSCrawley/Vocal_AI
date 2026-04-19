# VOICE — Product Vision

## What VOICE is

VOICE is a mobile app that trains the human voice. It serves two distinct populations with a shared underlying technology and coaching philosophy:

**Speaking users** want a voice that carries authority, connects with audiences, and holds attention. They are public speakers, podcasters, video creators, teachers, job seekers, executives, and anyone who communicates for a living or wants to communicate better.

**Singing users** want to expand what their voice can do musically. They are casual singers who want to stop sounding flat, intermediate singers working on range and style, and serious vocalists training specific techniques — from jazz phrasing to operatic support to heavy metal distortion.

Both populations share the same core need: **they want to hear themselves getting better, and they want to know what to practice.**

---

## The core insight

The real value of VOICE is not "AI analyzes your voice." That framing positions the product as a measurement tool — useful but not motivating.

The actual value is: **VOICE helps a person build accurate self-hearing, self-trust, and repeatable practice habits that gradually turn isolated good moments into stable vocal skill.**

This distinction matters for every product decision:
- The coach should manufacture "good take moments" the user can own, not just flag errors
- Progress should be felt, not just measured
- The learning loop should build internal cues (how it feels) alongside external feedback (what the meter shows)
- The reward system should reinforce competence, not just streaks

---

## The two tiers

### Speaking Tier

**Target users**: Public speakers, TED/conference presenters, podcast hosts, YouTube/social media creators, teachers and professors, executives and managers, job seekers, anyone who wants to sound more confident or authoritative.

**Core training goals**:
- Pace and rhythm (speaking at a clear, engaging rate; using pause effectively)
- Pitch variability and prosody (avoiding monotone; using inflection for emphasis and authority)
- Projection and dynamics (volume control, carrying power)
- Resonance and tone placement (fuller, richer voice quality)
- Articulation and clarity
- Filler word reduction (um, uh, like, you know)
- Confidence markers (downward inflection at sentence ends; not uptalk)
- Breath support and endurance (speaking for extended periods without fatigue)

**Specialization tracks** (Phase 2+):
- TED Talk / Conference Presentation
- Podcast Voice
- Social Media / Short-Form Video
- Job Interview Confidence
- Classroom Presence (teachers)
- Executive Communication

### Singing Tier

**Target users**: Casual singers who want to sound better, shower singers going public, hobbyists learning songs they love, musicians adding vocals, aspiring performers working on range and style.

**Core training goals**:
- Pitch accuracy and stability
- Vocal range expansion (higher and lower)
- Breath control and support
- Volume control (singing louder and softer with intention)
- Consistent tone
- Vibrato development
- Style-specific techniques

**Style packs** (Phase 3):
- Pop / Contemporary
- Jazz and Blues
- Classical / Opera
- Musical Theatre
- R&B / Soul
- Rock
- Heavy Metal
- Grindcore / Extreme vocals (safe technique emphasis)
- Country
- Gospel

**Karaoke Mode** (Phase 2): Users select songs and practice singing them snippet by snippet. The AI removes the vocal track, analyzes the original vocals, and coaches the user toward matching the melody, phrasing, and dynamics of the original.

---

## The AI avatar coach

VOICE's coach is an animated character — a mascot with a distinct visual identity and voice personality. It is not a chatbot window. It is a coach the user has a relationship with.

The avatar:
- Introduces exercises and models what good performance looks like
- Gives one clear coaching cue at a time (never a list of failures)
- Reacts in real time during exercises (visual feedback synchronized with performance)
- Celebrates wins with genuine specificity ("You held within ±20 cents for 4.2 seconds — that's your best hold yet")
- Asks reflection questions after sessions ("What felt easiest today?" / "What will you focus on next time?")
- Adapts its tone to the user's progress state — more encouraging when struggling, more challenging when thriving
- Has different behavioral personas appropriate to Speaking vs Singing contexts

The avatar is designed using the coaching philosophy principles from research on studio music instruction and Self-Determination Theory: rapport, questioning, modeling, and active student participation all matter. The avatar simulates these through dialogue, pacing, and reaction.

---

## Coaching philosophy principles (operational rules)

These rules govern every exercise, every piece of feedback copy, every avatar interaction, and every score display:

1. **Safety first** — never encourage pushing into strain; prefer ease-first progressions; surface stop cues when high-risk patterns are detected
2. **One correction at a time** — prioritize a single improvement target per attempt to reduce cognitive overload
3. **Truthful, bounded feedback** — if the signal is noisy (room noise, clipping), say so and route to mic check rather than give misleading coaching
4. **Autonomy-supportive language** — present choices ("try again" vs "move on"), emphasize experimentation, avoid shame
5. **Competence scaffolding** — engineer early wins (short exercises in comfortable range/pace), then increase difficulty progressively
6. **Manufacture good take moments** — save the user's best attempt; replay it; label the success precisely
7. **Build internal cues** — after exercises, ask what the user felt, not only what the score shows
8. **Lightweight reflection** — a two-question post-session reflection is enough; make it tap-to-select, not an essay

---

## User journey overview

### First session
1. Welcome screen — tier selection (Speaking or Singing)
2. Goal selection (one primary goal, e.g., "Pitch accuracy" or "Confident pace")
3. Baseline assessment — one short exercise to establish starting point
4. First coaching moment — avatar gives the user their first win and sets their first practice focus
5. Schedule prompt — "When do you want to practice? Set a reminder."

### Daily session
1. Avatar greets user, references last session ("Last time you worked on pace — ready to build on that?")
2. Warm-up (1–2 minutes: breathing, gentle exercises)
3. Core exercise set (2–4 exercises, 10–20 minutes total)
4. Best-take replay — user hears their best attempt
5. Post-session reflection — two quick questions
6. XP award + streak update + any badge unlocks
7. Next session preview — avatar tells the user what to expect next time

### Karaoke session (Singing Tier, Phase 2)
1. Song search and selection
2. AI processes the song (vocal separation + melody extraction) — async, ~30s
3. Snippet selection — AI or user picks a target phrase
4. Listen to original snippet (with vocal track)
5. Practice over instrumental — one snippet at a time
6. AI compares user recording to original; gives specific feedback
7. Repeat until the snippet matches; move to next snippet
8. End-of-session: full snippet chain playback (the user's assembled version)

---

## Phased roadmap

### Build 0.1 — Speaking Tier proof of concept
Single narrow loop: mic check → one speaking exercise (passage reading at target pace) → live pace guidance → score + coaching tip

### Build 0.2 — Singing Tier proof of concept
Single narrow loop: mic check → sustained-note exercise → live pitch guidance → score + best-take replay

### MVP (Build 1.0)
- Both tiers fully operational
- Onboarding with tier + goal selection
- Baseline assessment
- Daily session structure (warm-up + core + reflection)
- Avatar coach with all behavioral states
- Progress tracking and XP/streak system
- Best-take save and replay
- Core exercise library (10+ exercises per tier)

### Phase 2 — Depth and engagement
- Karaoke Mode (Singing Tier)
- Specialization tracks (Speaking Tier)
- SOVT warm-up exercises
- Adaptive difficulty
- Filler word real-time detection (Speaking)
- Push notifications with personalized prompts

### Phase 3 — Style and community
- Style packs for Singing Tier (jazz, opera, metal, etc.)
- Advanced speaking specializations (TED, podcast, interview)
- Community features (optional: share recordings, compare progress)
- Optional live coaching tier (connect with human coaches)

---

## Success metrics

### Signal quality (engineering)
- Pitch tracker accuracy: < 10 cents median error on controlled reference tones
- Feedback latency: < 80ms from voice onset to visual update
- Vocal separation quality: MOS > 3.5 on separated stems

### Learning efficacy (user studies)
- Within-subject, 2-week: increased time-in-tolerance (singing) and improved pace consistency (speaking)
- Self-reported: "I knew what to do next" / "I felt improved today" (competence construct)

### Engagement (product analytics)
- Day-1 to Day-7 retention
- Sessions per week per active user
- Reflection completion rate (proxy for emotional engagement)
- Best-take replay rate (proxy for self-efficacy reinforcement)

---

## Design principles summary

| Principle | What it means in practice |
|---|---|
| Make progress legible every session | Always show a "since last time" delta, even if small |
| Preserve learner agency | "Try again / Save & move on / Change goal" — never guilt-trip streak breaks |
| Use feedback like a coach, not a scoreboard | One score + one tip; no dashboard of sub-scores by default |
| Teach self-coaching through reflection | Two prompts after every session, tap-to-select |
| Reinforce good self-voice moments | Save best take automatically; replay with precise success labels |
| Safety first, always | Stop cues when strain patterns detected; no "push harder" language |
