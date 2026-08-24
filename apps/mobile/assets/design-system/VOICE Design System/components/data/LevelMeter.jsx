import React from 'react';

/**
 * Vertical fill meter for live volume during the sustained-note exercise —
 * matches SustainedNoteScreen's meterContainer (40x200, radius 20, success
 * fill growing from the bottom).
 */
export function LevelMeter({ value = 0 }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      style={{
        width: 'var(--meter-width)',
        height: 'var(--meter-height)',
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-meter)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div style={{ width: '100%', height: `${pct}%`, background: 'var(--feedback-success)', transition: 'height 0.1s ease' }} />
    </div>
  );
}
