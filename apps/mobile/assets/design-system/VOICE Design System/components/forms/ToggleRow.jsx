import React from 'react';

/**
 * Labelled row with a trailing switch — the Settings screen pattern
 * ("Audio Storage Consent"). Renders a native-style toggle track using the
 * exact trackColor/thumbColor pairing from SettingsScreen.tsx.
 */
export function ToggleRow({ title, description, checked = false, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 16,
        borderBottom: '1px solid var(--surface-card)',
        gap: 16,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          {title}
        </div>
        {description && (
          <div style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: '20px' }}>
            {description}
          </div>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange && onChange(!checked)}
        style={{
          width: 51,
          height: 31,
          borderRadius: 999,
          border: 'none',
          padding: 2,
          background: checked ? 'var(--feedback-success)' : 'var(--surface-card)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: checked ? 'flex-end' : 'flex-start',
          transition: 'background 0.15s ease',
        }}
      >
        <span style={{ width: 27, height: 27, borderRadius: '50%', background: 'var(--text-primary)', display: 'block' }} />
      </button>
    </div>
  );
}
