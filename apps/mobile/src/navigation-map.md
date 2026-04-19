# VOICE — Mobile App Navigation Map

## Navigation architecture

React Navigation v6 with a stack/tab hybrid structure.
Root navigator is a stack. Once authenticated, users land on a tab navigator.

---

## Onboarding stack (unauthenticated)

```
Welcome
  ↓
Tier Selection          ← Speaking or Singing
  ↓
Goal Selection          ← One primary goal (filtered by tier)
  ↓
Mic Permission          ← System permission prompt + explanation
  ↓
Mic Check               ← Signal quality gate (noise floor + clipping)
  ↓
Baseline Assessment     ← One short exercise to set the starting point
  ↓
First Win Screen        ← Avatar celebrates first result; sets first focus
  ↓
Schedule Prompt         ← "When do you want to practice?"
  ↓
[Main Tab Navigator]
```

---

## Main tab navigator (authenticated)

Four tabs:

```
┌─────────┬──────────┬──────────┬──────────┐
│  HOME   │ PRACTICE │ PROGRESS │ SETTINGS │
└─────────┴──────────┴──────────┴──────────┘
```

---

## HOME tab

```
Home Dashboard
  ├── Today's Practice Card  → Session Stack
  ├── Best Take Replay       → Best Take Playback Screen
  ├── Streak + XP summary
  ├── Recent Badges
  └── Song in Progress (if Karaoke active) → Karaoke Mode Stack
```

---

## PRACTICE tab

```
Practice Home
  ├── [Speaking Tier]
  │     ├── Today's Session   → Session Stack (Speaking)
  │     ├── Exercise Library  → Exercise List → Exercise Detail
  │     └── Specialization Tracks (Phase 2)
  │
  └── [Singing Tier]
        ├── Today's Session   → Session Stack (Singing)
        ├── Exercise Library  → Exercise List → Exercise Detail
        ├── Karaoke Mode      → Karaoke Mode Stack (Phase 2)
        └── Style Packs       → Style Pack List → Style Pack Detail (Phase 3)
```

---

## Session Stack (both tiers, similar structure)

```
Session Loader           ← Builds session plan; shows avatar greeting
  ↓
Warm-Up Exercise(s)
  ↓
Core Exercise Loop:
  Exercise Intro Screen  ← Avatar explains the exercise
      ↓
  Mic Check Gate         ← Quick signal quality check (if > 10 min since last)
      ↓
  Live Exercise Screen   ← Real-time audio feedback (pitch meter / speaking meter)
      ↓
  Result Screen          ← Score + avatar coaching + action choice
      ↓  (try again or continue)
  [repeat for remaining exercises]
  ↓
Best Take Playback       ← Best attempt from this session, played back
  ↓
Reflection Screen        ← Two quick prompts (tap to select)
  ↓
Session Complete Screen  ← XP award + badges + streak update
```

---

## Karaoke Mode Stack (Phase 2, Singing Tier only)

```
Karaoke Home             ← Songs in progress + search
  ↓
Song Search              ← Search by title/artist
  ↓
Song Detail              ← Difficulty, range, phrase map preview
  ↓
Processing Screen        ← While Demucs runs (~30s) — avatar explains what's happening
  ↓
Song Phrase Map          ← Visual progress map of all snippets
  ↓
Snippet Intro            ← Avatar selects/confirms the snippet to practice
  ↓
Listen Screen            ← Play original snippet (with vocal)
  ↓
Instrumental Preview     ← Play instrumental only (preview before recording)
  ↓
Karaoke Record Screen    ← Countdown + record attempt over instrumental
  ↓
Karaoke Result Screen    ← Match score + avatar coaching + comparison waveform
  ↓  (try again or next snippet)
Snippet Complete Screen  ← Celebrates completion; unlocks next snippet
  ↓
[return to Song Phrase Map]
```

---

## PROGRESS tab

```
Progress Home
  ├── XP + Level overview (skill tree node visual)
  ├── Speaking skill tree (full)
  ├── Singing skill tree (full)
  ├── Session history (calendar view)
  ├── Best Takes Archive (all saved best takes, playable)
  ├── Badge Collection
  └── Song Progress (Karaoke Mode — songs in progress + completed)
```

---

## SETTINGS tab

```
Settings Home
  ├── Account
  │     ├── Profile
  │     └── Subscription
  ├── App
  │     ├── Active Tier (Speaking / Singing / Both)
  │     ├── Primary Goal
  │     └── Practice Schedule (reminder time)
  ├── Audio
  │     ├── Mic Sensitivity
  │     └── Reference Tone Volume
  ├── Avatar
  │     └── Customization (unlocked options)
  ├── Privacy & Data
  └── About / Help
```

---

## Modal screens (accessible from anywhere)

```
Vocal Safety Modal       ← Shown when strain-risk proxy triggered
Mic Check Modal          ← Shown before any recording if signal quality unknown
Badge Unlock Modal       ← Shown at session end for new badges (non-interrupting)
Level Up Modal           ← Shown at session end for level advances
Streak Broken Modal      ← Shown on return after missed days (no guilt-trip language)
```

---

## Screen naming convention (for React Navigation)

```
Auth stack:     Welcome, TierSelect, GoalSelect, MicPermission, MicCheck,
                BaselineAssess, FirstWin, SchedulePrompt

Main tabs:      HomeTab, PracticeTab, ProgressTab, SettingsTab

Session:        SessionLoader, WarmUpExercise, ExerciseIntro, LiveExercise,
                ExerciseResult, BestTakePlayback, SessionReflection, SessionComplete

Karaoke:        KaraokeHome, SongSearch, SongDetail, SongProcessing,
                SongPhraseMap, SnippetIntro, SnippetListen, SnippetRecord,
                SnippetResult, SnippetComplete

Progress:       ProgressHome, SkillTree, SessionHistory, BestTakesArchive,
                BadgeCollection, SongProgress

Settings:       SettingsHome, AccountSettings, AppSettings, AudioSettings,
                AvatarCustomization, PrivacySettings

Modals:         VocalSafetyModal, MicCheckModal, BadgeUnlockModal,
                LevelUpModal, StreakBrokenModal
```
