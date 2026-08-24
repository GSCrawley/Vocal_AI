import * as React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  /** Visual style. primary = accent fill (main CTA). secondary = raised surface. muted = outline, used for "Try Again". danger = destructive (not yet used in-app). */
  variant?: 'primary' | 'secondary' | 'muted' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}
