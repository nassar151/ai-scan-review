import type { CodeLocation } from '@scan/shared';

export interface CodeLocationsProps {
  locations: CodeLocation[];
  occurrences: number;
}
