# VOICE Design System

VOICE is an AI-empowered personal vocal coaching mobile app, built by a small team as a
cross-platform (Expo/React Native) monorepo. This design system is derived entirely from
that codebase — no Figma, brand guide, or logo file was provided.

**Source repository**: [GSCrawley/Vocal_AI](https://github.com/GSCrawley/Vocal_AI) (branch `main`).
Explore it directly for the fullest picture — in particular `docs/product/product-vision.md`,
`docs/product/ai-avatar-spec.md`, `docs/product/*-spec.md` (karaoke, reward system, singing/speaking
tiers), and `apps/mobile/src/screens/*.tsx` for the current (early, "Build 0.1") UI implementation.

## What VOICE is

VOICE trains the human voice for two populations, sharing one coaching engine and one AI
avatar coach:

- **Singing Tier** (Phase 1 / current build focus) — casual and serious singers working on
  pitch accuracy, range, breath control, tone, vibrato, and style.
- **Speaking Tier** (Phase 2) — public speakers, podcasters, teachers, and creators working
  on pace, prosody, projection, resonance, filler-word reduction, and confidence markers.

The product's real value, per its own docs: *not* "AI analyzes your voice" but helping a
person build accurate self-hearing, self-trust, and repeatable practice habits. Every
exercise follows the same loop — **record → analyze → score → one plain-language coaching
cue** — delivered by an animated AI avatar coach (working name **VOCA**, not yet
visually designed anywhere in the repo).

The currently-implemented proof of concept ("Build 0.1") is a single narrow loop: mic
permission → mic check → sustained-note hold exercise → live pitch/volume feedback →
score → coaching tip → reflection → XP/reward summary. That loop is what the **Mobile App**
UI kit in this project recreates.

## What's in this design system

- **`tokens/`** — colors, typography, spacing as CSS custom properties, imported by `styles.css`.
- **`components/`** — reusable UI primitives, grouped by concern:
  - `core/` — **Button**, **Badge**
  - `forms/` — **OptionChip**, **ToggleRow**
  - `feedback/` — **ScoreCard**, **CoachingCard**, **XPCard**
  - `data/` — **LevelMeter**
  - `avatar/` — **AvatarOrb** — the coach avatar, rendered as an animated circular orb (see "The avatar orb" below)
- **`ui_kits/mobile-app/`** — an interactive click-through recreation of the Build 0.1 app flow.
- **`guidelines/`** — foundation specimen cards (colors, type, spacing, brand/iconography),
  rendered in the Design System tab.
- **`assets/`** — currently empty. See "On the missing logo" below.
- **`SKILL.md`** — portable skill file for using this system inside Claude Code.

## Content fundamentals

VOICE's copy is written almost entirely as **avatar dialogue** — the coach talking directly
to the user in first person, not app-chrome copy. Source: `docs/product/ai-avatar-spec.md`
and `packages/coaching-rules/src/template-fallback.ts` (the actual shipped coaching-message
templates).

- **Voice**: warm, direct, plain-spoken. Never corporate, never clinical. Reads like a real
  coach standing next to you, not a fitness-app notification.
- **Person**: first person from the coach ("I'm listening," "I'm having trouble hearing you
  clearly"), second person to the user ("You held within ±20 cents for 4.2 seconds").
- **Specific > vague, always.** The spec states this as a rule, not a preference: *"You held
  within ±20 cents for 3.2 seconds"* beats *"Nice work."* Real shipped example (developing
  band): *"You drifted sharp about halfway through — your breath probably got lighter right
  there. This time, keep the same breath pressure through the whole hold. Don't back off. Go
  again."*
- **One correction per attempt.** Never a list, never a dashboard of failures. Coaching copy
  is always structured praise → one correction → one action tip.
- **Agency language.** "Want to try again?" not "You need to try again." Choices are offered,
  not demanded, per the product's autonomy-supportive coaching philosophy.
- **No shame, ever.** No language implying failure, disappointment, or wasted effort — even
  the lowest-scoring "retry" band template opens with something earned: *"You gave it a full
  attempt — let's reset and try again."*
- **Casing**: sentence case throughout, in-app and in docs. Screen titles are short noun
  phrases ("Result", "Settings", "Quick Reflection"). Buttons are short imperative verbs
  ("Ready", "Continue", "Try Again", "Grant Permission").
- **Emoji**: essentially unused. The one exception in the whole codebase is a single 🏆 on
  the personal-best milestone badge (`RewardSummaryScreen.tsx`) — treat emoji as a rare,
  earned-moment device, not a default decoration.
- **Numbers are precise, not rounded for effect**: "6.1 seconds," "±20 cents," "192 words per
  minute." Precision is part of how the product builds trust in its own feedback.

## The avatar orb

The product spec (`docs/product/ai-avatar-spec.md`) describes the coach "VOCA" as an
illustrated Lottie character — that character has never been designed anywhere in the repo.
This system instead renders the coach as **`AvatarOrb`**: a circular, speaker-like form
rather than a face. This is a deliberate design decision (not sourced from the codebase),
made because a stable, non-figurative shape is far cheaper to keep consistent across an
AI-assisted build than an illustrated character, and it maps naturally onto the thing the
product is actually about: sound and vibration.

- **Idle** — a soft breathing scale, a slowly-rotating dashed attention ring. Calm, waiting.
- **Listening** — radial bars around the core react to the user's live volume, like a
  speaker cone moving — this is the "vibrates when it hears/speaks you" behavior.
- **Analyzing** — the ring spins faster; a small center dot pulses in place. Intentional,
  not a generic spinner (matches the spec's explicit note that this state "should feel
  intentional, not like a loading spinner").
- **Coaching** — same radial vibration as Listening, tinted to the active tier, while the
  coach is speaking its one praise + one tip.
- **Celebrating** — a bouncier scale, a fast ring spin, and tighter/quicker ripple rings —
  distinct from Coaching at a glance, per the spec's "users should be able to tell from
  glance whether they're being praised or corrected" rule.
- **Playback** — radial bars render a static provided waveform instead of live audio, for
  "this is what you sound like now" vs. "you're aiming for something like this" comparisons.
  Two layouts are demoed on the component's card: two orbs side by side, or one orb with a
  toggle that swaps its waveform and label.
- **Tier tinting** — `tier="speaking"` recolors the orb amber/gold, `tier="singing"` violet,
  matching `AVATAR_TIER_COLORS` — carrying that already-defined tier language into the one
  piece of UI the user looks at during every single exercise.
- **Haptic stand-in** — the spec never mentions haptics, but a verbal/audio coaching
  interaction is a strong candidate for a light haptic tick each time the orb starts
  speaking. HTML can't trigger real device haptics, so `AvatarOrb`'s `hapticStandIn` prop
  renders a small pulsing dot purely to mark *where* that tick should fire in a real build.

## Visual foundations

The only real visual source is `packages/ui-tokens/src/index.ts` (8 colors) plus
`AVATAR_TIER_COLORS` in `packages/avatar-state/src/index.ts`. Everything else below is
either directly observed in the RN screens (`apps/mobile/src/screens/*.tsx`) or a documented
extension built to be consistent with that seed.

- **Color**: **updated to a light theme by explicit direction** — the source app itself is
  dark (`#0b1020` background, `#151c32` surface; preserved as `--voice-dark-*` reference
  tokens in `tokens/colors.css` in case a dark mode is wanted later), but nothing in the repo
  mandates dark, and this system's default is now a soft, lavender-tinted light surface
  (`#f6f5fb` app background, white `#ffffff` cards) with the same indigo-violet accent
  (`#6d7cff`) and softened semantic feedback colors (success green, warning amber, danger red
  — each pulled slightly toward gray so they read as gentle on a light surface rather than
  alarm-colored). The avatar tier pair — warm amber/gold for Speaking, cool violet/purple for
  Singing — is unchanged from the source and is now the primary way `AvatarOrb` communicates
  which tier a session belongs to.
- **Type**: no typeface is specified anywhere in the repo — RN screens use the OS system
  font only. See "Font substitution" below.
- **Spacing**: a loose, non-strict 4px-rooted scale. Literal values in use: 8, 12, 14, 16,
  20, 24, 32, 40, 48, 60 (kept as-is, not snapped to a stricter grid).
- **Backgrounds**: flat solid color only. No images, gradients, textures, illustrations, or
  patterns anywhere in the app. No hand-drawn elements.
- **Cards / surfaces**: the source app is flat (`surface` color flat on `background` color,
  no shadows anywhere) — on a near-white light surface that flatness stops working (a white
  card on an off-white background needs *some* separation), so this system adds one very
  soft `--shadow-card` token (a 2-layer, low-opacity shadow) used only on `ScoreCard` and
  `XPCard`. Everything else stays flat, matching the source's minimal-decoration instinct.
- **Corner radii**: small and consistent — 8px (option chips, dividers), 16px (score/coaching/
  XP cards), 20px (the sustained-note level meter, radius = half its 40px width, making it a
  capsule). Nothing is fully rounded except the meter capsule and future pill badges.
- **Borders**: a single 1px hairline pattern, used only for selection state (reflection chips
  get a 1px accent-colored border when selected) — otherwise borderless.
- **Selection / active fills**: a consistent `rgba(accent-or-semantic-color, 0.1–0.2)` tint
  pattern (`hexToRgba` helper appears three times in the codebase, always at 10–20% alpha) —
  this is the system's one "tinted fill" convention, used for selected reflection chips and
  the personal-best/milestone badge.
- **Animation**: minimal in the current build — an `Animated.timing` volume meter (100ms
  ease) is the only implemented motion. The product spec (avatar) calls for cross-fades
  between avatar states, an instant cut into "listening," and a distinct "pop" for
  celebration — none of that is built yet, but it is documented intent worth honoring in any
  new avatar work.
- **Hover / press states**: not really defined — RN's `<Button>` uses native platform press
  feedback. This system defines a light `scale(0.97)` press state and no hover-color shift
  for web contexts, since none is specified upstream.
- **Transparency / blur**: transparency is used only for the tint-fill convention above; no
  blur/glass effects appear anywhere in the source.
- **Imagery**: none exists in the product yet (no photography, no illustration). When actual
  product imagery is produced, the coaching philosophy docs suggest warmth and specificity
  over polish — but this is speculative, not sourced.
- **Layout**: single-column, centered, one primary action per screen. No persistent nav bar,
  tab bar, or header chrome in the current build (`headerShown: false` on every screen) — the
  app is a linear guided flow, not a browseable app shell.

### Font substitution — please read

No font files or family names exist anywhere in the repository. The typography tokens in
this system substitute **Manrope** (UI/display) and **JetBrains Mono** (numeric readouts —
Hz, cents, XP, dB) via Google Fonts, chosen to match the product's warm-but-precise,
metrics-heavy tone. **If VOICE has real brand fonts, please supply them** and swap the
`@import` at the top of `tokens/typography.css`.

## Iconography

No icon assets (SVG, PNG, or icon font) exist in the repository, and no icons are actually
rendered by any current screen — every screen in Build 0.1 is text- and color-only. The
one relevant signal is a dependency on `@expo/vector-icons` (bundles Ionicons/Feather/etc.)
declared in `pnpm-lock.yaml` but not yet imported anywhere. The `Iconography` specimen card
in this system substitutes **[Lucide](https://lucide.dev)** (single-stroke, Feather-like —
the closest visual match to what `@expo/vector-icons`' Feather set would produce) via CDN.
Flag this to the brand/product team if a specific icon set is intended.

## On the missing logo

There is **no logo anywhere in the source repository.** `apps/mobile/assets/{icon,
adaptive-icon,splash-icon,favicon}.png` are Expo's default placeholder rings (unmodified
scaffold output, not a real mark) and were not copied into this design system. The `Brand`
group's wordmark card renders "VOICE" in plain type instead of a logo. **Please share real
logo files if they exist** — until then, any design work from this system should use the
plain wordmark, not an invented symbol.

## Index

- `styles.css` — root stylesheet, imports everything under `tokens/`.
- `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`, `tokens/base.css`
- `components/core/{Button,Badge}` — primary CTA + status pill
- `components/forms/{OptionChip,ToggleRow}` — reflection chip + settings switch row
- `components/feedback/{ScoreCard,CoachingCard,XPCard}` — post-exercise result cards
- `components/data/LevelMeter` — live recording volume meter
- `components/avatar/AvatarOrb` — coach avatar orb (idle/listening/analyzing/coaching/celebrating/playback)
- `ui_kits/mobile-app/` — Build 0.1 singing loop, interactive click-through
- `guidelines/colors/`, `guidelines/type/`, `guidelines/spacing/`, `guidelines/brand/` —
  specimen cards
- `SKILL.md` — Claude Code / Agent Skills-compatible skill file

## Intentional additions

No component inventory is defined anywhere in the source (no component library, no Figma
file) — screens are built with raw React Native primitives (`<Button>`, `<Switch>`,
`<TouchableOpacity>`). The components in this system were authored from-scratch, sized to
what the Build 0.1 screens actually use, plus one deliberate addition:

- **Button** — primary CTA (accent/secondary/muted/danger variants)
- **Badge** — status pill (personal-best, band labels)
- **OptionChip** — selectable reflection-prompt chip
- **ToggleRow** — labelled settings row with a switch
- **ScoreCard** — post-exercise numeric score card
- **CoachingCard** — avatar praise + tip message pair
- **XPCard** — session XP readout
- **LevelMeter** — live vertical recording-volume meter
- **AvatarOrb** *(intentional addition — not sourced)* — the coach avatar, since the repo
  describes an avatar character (`docs/product/ai-avatar-spec.md`) but never designs or
  builds one anywhere. See "The avatar orb" above for the reasoning.
