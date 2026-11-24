import type { CodeFix } from '@scan/shared';

export interface AiFixPanelProps {
  fix: CodeFix;
  model: string;
}
