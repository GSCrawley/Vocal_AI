import React from 'react';

/**
 * Selectable text chip used for reflection prompts ("Easy" / "Challenging" /
 * "Felt Tension"). Selected state = accent border + accent-soft fill,
 * matching the exact hexToRgba(accent, 0.1) pattern from ReflectionScreen.
 */
export function OptionChip({ children, selected = false, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        fontFamily: 'var(--font-sans)',
        fontSize: 16,
        fontWeight: selected ? 700 : 400,
        color: selected ? 'var(--voice-accent)' : 'var(--text-primary)',
        background: selected ? 'var(--action-primary-soft)' : 'var(--surface-card)',
        border: selected ? '1px solid var(--voice-accent)' : '1px solid transparent',
        borderRadius: 'var(--radius-sm)',
        padding: '14px 20px',
        marginBottom: 12,
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
    >
      {children}
    </button>
  );
}
