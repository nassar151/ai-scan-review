import type { Finding } from '@scan/shared';

export interface FindingsTableProps {
  findings: Finding[];
  expandedId?: string;
  onToggle: (findingId: string) => void;
}
