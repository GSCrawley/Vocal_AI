The VOICE avatar coach — a circular "orb" with a dashed attention ring and radial bars that vibrate outward like a speaker cone when the coach is speaking, listening, or playing back audio.

```jsx
<AvatarOrb state="listening" tier="singing" size={220} hapticStandIn />
<AvatarOrb state="coaching" tier="speaking" size={180} />
<AvatarOrb state="celebrating" size={200} />
<AvatarOrb state="playback" label="You" waveform={[0.2,0.6,0.9,0.4,0.7,0.3]} />
<AvatarOrb state="playback" label="Target" waveform={[0.5,0.5,0.6,0.55,0.6,0.5]} />
```

States: `idle` (slow breathing scale, dashed ring rotates very slowly), `listening`/`coaching` (radial bars react to a simulated live amplitude), `analyzing` (small pulsing center dot, faster ring rotation), `celebrating` (bouncy scale + fast ring spin + tighter ripple rings), `playback` (radial bars render a static waveform array instead of live audio — use this for "this is what you sound like" / "aim for this" comparisons, one orb per source, distinguished by `label`).

`tier` recolors the orb to match Speaking (amber) or Singing (violet) tier theming; omit for the neutral accent color. `hapticStandIn` is a demo-only visual marker for where a real haptic tick belongs — it has no real haptic effect in HTML.
