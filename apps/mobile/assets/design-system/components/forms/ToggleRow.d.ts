import * as React from 'react';

export interface ToggleRowProps {
  title: string;
  description?: string;
  checked?: boolean;
  onChange?: (value: boolean) => void;
}
