import React from 'react';

/**
 * Small status pill. Used for "Personal Best!", performance band labels,
 * and the 🏆 milestone badge on RewardSummary.
 */
export function Badge({ children, tone = 'accent' }) {
  const tones = {
    accent: { background: 'var(--action-primary-soft)', color: 'var(--voice-accent)' },
    success: { background: 'var(--feedback-success-soft)', color: 'var(--feedback-success)' },
    warning: { background: 'var(--feedback-warning-soft)', color: 'var(--feedback-warning)' },
    danger: { background: 'var(--feedback-danger-soft)', color: 'var(--feedback-danger)' },
  };
  const t = tones[tone] || tones.accent;
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-sans)',
        fontWeight: 700,
        fontSize: 14,
        padding: '10px 20px',
        borderRadius: 'var(--radius-sm)',
        ...t,
      }}
    >
      {children}
    </span>
  );
}
