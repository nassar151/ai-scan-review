import type { Finding } from '@scan/shared';
import type { StackedTextProps } from '../../common/StackedText/StackedText.types';

export interface FindingTableRowProps {
  finding: Finding;
  columnCount: number;
  isExpanded: boolean;
  onToggle: (findingId: string) => void;
}

export type CellText = Omit<StackedTextProps, 'mono'>;
