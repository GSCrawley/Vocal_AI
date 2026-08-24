import React from 'react';

/**
 * XP readout card for RewardSummary — big success-colored number in a
 * flat surface card.
 */
export function XPCard({ xp }) {
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        paddingTop: 20,
        paddingBottom: 20,
        paddingLeft: 40,
        paddingRight: 40,
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-sans)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ color: 'var(--feedback-success)', fontSize: 'var(--text-3xl)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
        +{xp} XP
      </div>
    </div>
  );
}
