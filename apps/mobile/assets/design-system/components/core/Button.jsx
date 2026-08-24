import React from 'react';

/**
 * Primary interactive control. Variants map to the RN `<Button color={...}>`
 * pattern used throughout the app (accent = primary action, muted = secondary/
 * "Try Again", danger reserved for destructive confirms not yet in the app).
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
}) {
  const variants = {
    primary: { background: 'var(--action-primary)', color: '#ffffff' },
    secondary: { background: 'var(--surface-raised)', color: 'var(--text-primary)' },
    muted: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-hairline)' },
    danger: { background: 'var(--feedback-danger)', color: '#ffffff' },
  };

  const sizes = {
    sm: { padding: '8px 16px', fontSize: 14 },
    md: { padding: '12px 24px', fontSize: 16 },
    lg: { padding: '16px 32px', fontSize: 18 },
  };

  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-sans)',
        fontWeight: 700,
        borderRadius: 'var(--radius-sm)',
        border: v.border || 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        minHeight: 'var(--tap-target-min)',
        transition: 'opacity 0.15s ease, transform 0.1s ease',
        ...v,
        ...s,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {children}
    </button>
  );
}
