# VOICE — Karaoke Mode Specification

## What Karaoke Mode is

Karaoke Mode is VOICE's educational song-based learning feature, exclusive to the Singing Tier. It transforms a song the user loves into a structured vocal coaching curriculum — with the AI as the coach guiding them toward sounding like the original.

The critical distinction from regular karaoke: **the user never sings the whole song at once**. They practice one short snippet (a phrase, a line, or a challenging passage) at a time, drilling it until their version approaches the original, before moving forward. The AI drives this loop.

---

## User motivation

Most singing learners have songs they desperately want to be able to sing. This is one of the most powerful motivational hooks available — the user is working toward a goal that means something to them personally, not an abstract exercise. Karaoke Mode capitalizes on this by making "I want to sing this song" the entry point for a rigorous, structured coaching curriculum.

---

## Core loop (per snippet)

```
SELECT snippet
    ↓
LISTEN to original (with vocal track)
    ↓
LISTEN to instrumental only
    ↓
ATTEMPT: sing over instrumental (recorded)
    ↓
AI ANALYSIS: compare user pitch/timing/phrasing to original
    ↓
COACHING: one specific feedback item + targeted micro-exercise
    ↓
RE-ATTEMPT
    ↓
SCORE: does the user's version meet the match threshold?
    ↓ YES: mark snippet complete; unlock next snippet
    ↓ NO: coaching loop continues (max 3 attempts per session, then flag for next session)
```

---

## Song processing pipeline

### Step 1 — Song selection
The user searches for a song by title and artist. VOICE's backend queries a licensed audio database or proceeds through an approved acquisition path (see Legal section below).

Search results show:
- Song title, artist, album art
- Estimated difficulty (based on range, phrase length, and pitch complexity)
- Style tag (pop, jazz, rock, etc.)
- Whether the song has been processed already (cached) or needs to be processed (~30 seconds)

### Step 2 — Vocal separation (server-side)
Once the song is confirmed, the audio processor service runs Demucs on the full audio file:

- Input: full stereo mix (MP3/WAV)
- Output: instrumental stem, vocal stem
- Processing time: approximately 30–60 seconds server-side with GPU acceleration
- Results are cached permanently — a song only needs to be processed once

The vocal stem is used for:
- Reference pitch extraction
- Melody contour analysis
- Timing/phrase boundary detection

The instrumental stem is:
- Stored in Supabase Storage
- Streamed to the mobile app for practice playback

### Step 3 — Vocal analysis (reference extraction)
The isolated vocal track is analyzed to extract:

- **Pitch curve**: pYIN applied to the vocal stem (frame-by-frame frequency)
- **Phrase boundaries**: VAD + musical phrase detection (silence + melodic cadences)
- **Melody contour**: smoothed pitch curve per phrase
- **Dynamic profile**: RMS envelope across the song
- **Key and scale**: estimated from pitch distribution (helps set difficulty context)
- **Range**: lowest and highest notes in the vocal track

This data powers the comparison engine and the difficulty rating.

### Step 4 — Snippet selection
The AI selects an initial snippet to practice based on:
- The song's phrase structure (natural phrase boundaries)
- The user's current vocal range and skill level (matched to difficulty)
- An "easy win first" principle — the first snippet should be achievable within 2–3 attempts

The user can also manually select a specific passage they want to work on.

Snippet length: 4–12 seconds (one musical phrase). Never a full verse or chorus at once.

---

## Comparison algorithm

After the user records their attempt, the comparison engine runs:

### Pitch comparison (Dynamic Time Warping)
- User's pitch curve is extracted via pYIN
- DTW is used to align user pitch curve to reference pitch curve (accounts for timing differences)
- Output: similarity score (0–100) + cents deviation profile

**DTW rationale**: A user may sing a phrase slightly slower or faster than the original. DTW warps the time axis to find the best alignment before comparing pitch values — this is far more forgiving and accurate than frame-by-frame comparison.

### Timing comparison
- Phrase onset alignment: did the user start roughly on beat?
- Phrase duration: did the user hold notes approximately as long?
- This is measured loosely — phrasing freedom is allowed within a 15% timing margin

### Phrasing / contour comparison
- Gross shape of the melody (going up, coming down, long hold, short notes)
- Even if every individual pitch isn't perfect, a good contour match earns partial credit
- This prevents discouragement when pitch accuracy is developing

### Match threshold
A snippet is considered "complete" when the user achieves:
- MVP: overall match score ≥ 70 (pitch 60% + timing 20% + contour 20%)
- Advanced (Level 3+): threshold rises to 80
- The threshold is never presented as a hard pass/fail — the avatar frames it as "ready to move on" vs "let's polish this a bit more"

---

## Coaching within Karaoke Mode

The AI gives coaching after each attempt based on the dominant failure mode:

| Dominant failure | Avatar coaching message example |
|---|---|
| Consistently flat on a high note | "You're reaching that top note flat — try opening your mouth wider and think of the sound going up and over, not pushed out." |
| Rushing the phrase | "You're moving through the phrase a little fast — the original sits on that 'ooh' for almost a beat longer. Listen one more time, then match the breath." |
| Starting pitch wrong | "You're starting the phrase a bit low — listen to where it starts and try humming the note before you begin." |
| Good pitch, poor contour | "Your pitch is close, great work. The phrase has a little dip in the middle that you're skipping over — like a wave instead of a straight line. Try it again with that curve in mind." |
| Pitch inconsistency (wobble) | "There's some wobble on the sustained part — think steady breath, steady tone. Not louder, just steadier." |

Between attempts, the avatar may also offer a **micro-exercise**: a 10-second drill targeting the specific issue before the next attempt. For example:
- "Before your next try, just sing that high note by itself and hold it for 3 seconds." (pitch accuracy drill)
- "Say the rhythm of the phrase on a single note first, then add pitch." (timing drill)

---

## Session structure in Karaoke Mode

A Karaoke Mode session is 15–30 minutes and typically covers 2–4 snippets.

1. **Session open** — Avatar greets user, shows their song and current progress (which snippets are complete)
2. **Warm-up** (3 minutes) — breathing + 1–2 pitch exercises in the key of the song
3. **Snippet work** (core) — the loop described above, 2–4 snippets
4. **Best-take playback** — the user's best recorded attempt on each snippet, played in sequence (a "mini performance")
5. **Reflection** — two quick questions
6. **Progress update** — XP award; snippet completion shown on the song's progress map

---

## Song progress visualization

Each song the user is working on is represented as a **phrase map**: a horizontal timeline of the song divided into snippets. Each snippet shows:
- Status: locked / in progress / completed (green = matched; gold = "best take saved")
- The user's best match score
- A mini pitch trace of their best attempt vs the original

The phrase map gives the user a concrete visual of how far they've come through the song. When all snippets are complete, the song is marked "learned" and the user can play back their full assembled version.

---

## Legal framework

Vocal separation and local practice of copyrighted music for private educational use is generally considered fair use in the US and falls under similar educational exceptions in other jurisdictions. However, this area requires active legal review before commercial launch. Key considerations:

- VOICE should not allow users to export or share separated stems
- The separated stems should be stored server-side and only streamed to the requesting user
- Consider licensing agreements with music rights holders (similar to how Spotify Canvas or karaoke apps like Smule operate)
- A per-play royalty model (via services like MatchTune or Songfile) may be appropriate for Phase 2 launch
- The vocal separation pipeline must not be exposed as a general-purpose tool

---

## Technical implementation notes

### Mobile app (karaoke player)
- Instrumental track streamed from Supabase Storage (not downloaded whole)
- The player shows: waveform of the original vocal track (greyed out as reference), user's pitch line live
- Countdown before recording: "3, 2, 1, sing!"
- Recording duration is the snippet length ± 2 seconds (auto-stops)

### Backend (audio-processor service)
- Demucs job is queued via Redis when a new song is requested
- Job status is polled by the mobile app (or pushed via Supabase Realtime)
- Vocal analysis (pYIN on stem, DTW setup) runs after separation

### Caching
- Processed songs are cached indefinitely in Supabase Storage
- If 100 users request the same song, it is processed once
- A song catalog of the most-requested songs is pre-processed in advance (Phase 2)

---

## Karaoke Mode — phased rollout

### Phase 2 (initial launch)
- Song search → vocal separation → snippet practice → comparison → coaching loop
- Manual snippet selection option
- Phrase map visualization
- Best-take playback assembly

### Phase 3
- AI-curated song suggestions based on user's current skill level and range
- "Song difficulty rating" displayed prominently before starting
- Community: users can see what songs other users are working on (anonymized)
- "Duet Mode": two users practice the same song and compare scores (social layer)
