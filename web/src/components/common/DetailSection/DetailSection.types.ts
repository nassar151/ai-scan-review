import type { ReactNode } from 'react';

export interface DetailSectionProps {
  title: string;
  /** Short helper under the title, e.g. where the text came from. */
  caption?: string;
  children: ReactNode;
}
