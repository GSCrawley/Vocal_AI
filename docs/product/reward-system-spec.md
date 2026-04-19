# VOICE — Reward System Specification

## Guiding principle

The reward system must reinforce **competence and self-efficacy** — not just habit completion. This is the critical distinction between a reward system that builds a sustainable learning relationship and one that creates hollow streak anxiety.

Research grounding (Self-Determination Theory): motivation is sustained when three needs are met — **autonomy** (I choose to practice), **competence** (I am getting better), and **relatedness** (I am part of something). The reward system's job is primarily to reinforce competence, secondarily to support autonomy (via choices and flexibility), and optionally to create a sense of belonging (Phase 3 community features).

**Anti-patterns to avoid**:
- Streak guilt: "You broke your 14-day streak!" should never appear. Instead: "Welcome back — let's pick up where you left off."
- Hollow XP: XP should correlate with real skill progress, not just time spent in the app
- Reward inflation: if every session ends in confetti and a badge, nothing feels meaningful
- Gamification-as-substitute: rewards supplement learning, never replace it

---

## XP system

### XP sources

XP is earned for meaningful actions, not for breathing:

| Action | XP | Rationale |
|---|---|---|
| Complete a session (any length) | 10 | Baseline for showing up |
| Score in "good" band on an exercise | +5 | Competence signal |
| Score in "excellent" band on an exercise | +10 | Competence signal |
| Achieve a personal best (any metric) | +15 | Celebrating improvement |
| Complete a snippet in Karaoke Mode | +10 | Goal-linked progress |
| Complete a full reflection (both prompts) | +5 | SRL behavior reinforcement |
| First session on a new exercise type | +5 | Exploration reward |
| Complete a full level (curriculum milestone) | +50 | Major milestone |
| Unlock a style pack (Singing Tier) | +25 | Advanced engagement |
| Streak milestone (7 / 30 / 100 days) | +30 / +75 / +200 | Long-term commitment |

### XP does NOT come from:
- Simply opening the app
- Duration of time in app (prevents padding sessions)
- Repeating exercises without improvement
- Watching intro animations

### XP levels

XP levels are named to reflect vocal development milestones, not arbitrary game tiers:

| Level | XP required | Name |
|---|---|---|
| 1 | 0 | Finding My Voice |
| 2 | 100 | First Breath |
| 3 | 250 | Warming Up |
| 4 | 500 | On Pitch |
| 5 | 900 | In the Room |
| 6 | 1,400 | Carrying It |
| 7 | 2,100 | Finding the Resonance |
| 8 | 3,000 | Full Voice |
| 9 | 4,200 | Consistent |
| 10 | 6,000 | Stage Ready |
| 11+ | +2,000 per level | [style/specialization names] |

Level names reinforce the coaching philosophy's language — they describe internal vocal states, not arbitrary power rankings.

---

## Streak system

### What counts as a streak day
- Any session completed, regardless of length
- Minimum: one completed exercise (to prevent gaming with empty sessions)
- A "session" does not require a full daily session — even a single warm-up exercise keeps the streak

### Streak protection
- Users get one "streak shield" per 7 days (automatically applied on the first missed day)
- Streak shields are earned, not purchased (to avoid pay-to-maintain-habit dynamics)
- If the streak breaks despite the shield: "Life happened — your streak resets but your progress doesn't. Here's where you were."

### Streak milestones (not streaks for their own sake)
Milestone achievements are granted at 7, 14, 30, 60, and 100 days. These are celebrated as genuine achievements, not as pressure.

### Language around streaks
- NEVER: "Don't break your streak!" / "You'll lose your streak!"
- ALWAYS: "Day 14 in a row — your voice is building something real."
- If streak breaks: "Welcome back. You haven't lost anything that matters — your best takes are still here."

---

## Achievements (badges)

Badges are granted for specific, meaningful accomplishments. Each badge has a clear name, a description of what it recognizes, and a visual design appropriate to the achievement.

### Speaking Tier badges

| Badge | Trigger |
|---|---|
| First Word | Complete first Speaking exercise |
| Under Control | Achieve target WPM on a Slow Read exercise |
| No Filler | Complete a 90-second speaking exercise with < 1 filler/minute |
| The Pause Master | Complete 10 Pause Practice exercises |
| Authority Voice | Achieve downturn on 90% of sentence-final clauses in a session |
| The Hook | Complete a 30-Second Hook exercise with "excellent" rating |
| 30 Days Speaking | 30-day streak (Speaking Tier) |

### Singing Tier badges

| Badge | Trigger |
|---|---|
| First Note | Complete first Singing exercise |
| In Tune | Score 80+ on pitch in any sustained exercise |
| Steady | Score 80+ on stability in any exercise |
| Found the Note | Achieve "onset accuracy" personal best |
| One Octave | Confirm usable range of at least one full octave |
| Range Expanded | Extend comfortable range by 1 semitone (tracked over time) |
| First Song | Complete first full song in Karaoke Mode |
| Style Pioneer | Complete first Style Pack exercise |
| 30 Days Singing | 30-day streak (Singing Tier) |

### Cross-tier badges

| Badge | Trigger |
|---|---|
| Both Voices | Complete at least 5 sessions in each tier |
| 100 Sessions | Complete 100 total sessions (any tier) |
| Best Take | Have a best take saved in both tiers |
| Reflector | Complete 20 post-session reflections |

---

## Skill trees

Each tier has a visual skill tree — a graph of skills that unlock as the user progresses. This serves two purposes: it makes progress visible at a glance, and it helps the user understand what they're working toward.

### Speaking Tier skill tree (simplified)

```
Breathing Foundation
    ↓
Resonance (hum)       Pace Control (Slow Read)
    ↓                       ↓
Projection           Pause Mastery
    ↓                       ↓
Dynamic Range         Prosody (Monotone Breaker)
    ↓                       ↓
          Authority Voice (The Authority Close)
                    ↓
         [Specialization Track Selection]
         /         |           \
    TED/Conference  Podcaster    Creator
```

### Singing Tier skill tree (simplified)

```
Breathing Foundation
    ↓
Reference Tone Match
    ↓
Sustained Hold         Scale Walk
    ↓                       ↓
Pitch Stability        Interval Training
    ↓                       ↓
Dynamic Control     Passaggio Navigation
    ↓                       ↓
          [Karaoke Mode unlocked]
                    ↓
         [Style Pack Selection]
    /      |        |       \
  Jazz   Opera   Metal   Grindcore
```

Locked nodes are shown as greyed out with a "X sessions away" indicator.

---

## Unlockable content

Rewards unlock content that is genuinely valuable, not just cosmetic (though cosmetic unlocks exist too):

### Functional unlocks (earned through skill progress)

| Content | Unlock condition |
|---|---|
| Karaoke Mode | Complete Level 2 (Singing Tier) |
| Style Packs | Complete Level 3 (Singing Tier) + specific badge per pack |
| Specialization Tracks | Complete Level 3 (Speaking Tier) |
| Advanced exercises | Specific score thresholds on prerequisite exercises |
| Long-form stamina exercises | Complete 30 sessions |

### Cosmetic unlocks (earned through XP or streaks)

| Content | Unlock condition |
|---|---|
| Avatar color variations | Level 4, 6, 8 |
| Avatar accessories | Streak milestones (30, 60, 100 days) |
| Celebration animation variants | 50 "excellent" band exercises |
| App theme colors | Level 5 |
| Profile badge collection | Various achievements |

---

## Progress visualization

The reward system informs several key UI elements:

### Session end screen
- Overall session score (single number)
- XP earned this session + running total
- Any new badges or unlocks (shown as a moment, not buried in a notification)
- Streak status (current day count, next milestone)
- "Since last time" delta — one metric that improved (always leads with progress, even if small)

### Home dashboard
- Skill tree progress (condensed — just which branch is active)
- Streak counter (prominent but not anxiety-inducing)
- "Your best take" — most recent personal best with playback
- Next session suggestion (what the AI recommends for today)
- Recent badges (last 3 earned)

### Progress screen
- Full XP history graph
- All badges in a collection view
- Skill tree (full view)
- Best takes archive (all saved takes, playable)
- Session history with per-session scores

---

## Reward timing principles

Based on behavioral reinforcement research:

1. **Immediate feedback** on exercise completion — score and tip within 1 second of analysis
2. **Delayed celebration** of milestones — don't interrupt mid-session with badge unlocks; surface them at session end
3. **Variable reward** for engagement — not every session should feel the same. An unexpected "personal best" notification mid-session (for an unexpected improvement) provides variable reinforcement
4. **Reflection before rewards** — show the post-session reflection prompts before the XP/badge summary. This sequences metacognition before external reward, reinforcing internal attribution ("I improved because of what I did, not because the app gave me points")
