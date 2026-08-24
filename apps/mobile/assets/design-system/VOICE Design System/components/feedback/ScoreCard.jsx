import React from 'react';

/**
 * Large numeric score readout in a flat surface card, exactly matching
 * ResultScreen's scoreCard (padding:32, radius:16, centered, "Personal Best!"
 * label in warning color when isBest).
 */
export function ScoreCard({ score, isBest = false }) {
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        padding: 32,
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ color: 'var(--voice-accent)', fontSize: 'var(--text-4xl)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
        {Math.round(score)}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 18, marginTop: 8 }}>Score</div>
      {isBest && (
        <div style={{ color: 'var(--feedback-warning)', fontWeight: 700, marginTop: 16, fontSize: 16 }}>
          Personal Best!
        </div>
      )}
    </div>
  );
}
