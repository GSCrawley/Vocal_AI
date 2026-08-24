import * as React from 'react';

export interface CoachingCardProps {
  /** Specific, positive observation — always references a measurable anchor when possible. */
  praise: string;
  /** Exactly one actionable correction for the next attempt. */
  tip: string;
}
