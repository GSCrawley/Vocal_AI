import * as React from 'react';

export interface OptionChipProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}
