import * as React from 'react';

export interface AvatarOrbProps {
  /** Behavioral state — mirrors docs/product/ai-avatar-spec.md's six states plus `playback`. */
  state?: 'idle' | 'listening' | 'analyzing' | 'coaching' | 'celebrating' | 'playback';
  /** Tints the orb core/ring to the active tier. Omit for the neutral accent color. */
  tier?: 'speaking' | 'singing';
  /** Diameter in px. */
  size?: number;
  /** Static 0–1 amplitude values for `playback` state — e.g. a recorded take or a target reference. Live states (`listening`/`coaching`) animate their own values. */
  waveform?: number[];
  /** Optional caption below the orb, e.g. "You" / "Target". */
  label?: string;
  /** Renders a small pulsing dot as a stand-in for a real device haptic tick while the orb is speaking. HTML cannot trigger real haptics — this only marks where one should fire. */
  hapticStandIn?: boolean;
}
