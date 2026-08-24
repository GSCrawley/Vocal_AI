import * as React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
}
