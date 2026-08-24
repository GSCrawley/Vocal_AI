import React from 'react';

/**
 * The avatar coach's one-praise + one-tip message pair — never more than
 * two lines of coaching per the product's "one correction at a time" rule.
 */
export function CoachingCard({ praise, tip }) {
  return (
    <div style={{ fontFamily: 'var(--font-sans)', textAlign: 'center' }}>
      <div style={{ color: 'var(--feedback-success)', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        {praise}
      </div>
      <div style={{ color: 'var(--text-primary)', fontSize: 16, lineHeight: '24px' }}>
        {tip}
      </div>
    </div>
  );
}
