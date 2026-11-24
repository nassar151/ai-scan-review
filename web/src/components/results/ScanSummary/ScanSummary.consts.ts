import { FINDING_TYPE, type FindingType } from '@scan/shared';

/** Display order and wording of the per-type counts. */
export const FINDING_TYPE_COUNT_LABELS: Array<{ type: FindingType; word: string }> = [
  { type: FINDING_TYPE.SECRET, word: 'exposed secret' },
  { type: FINDING_TYPE.CODE, word: 'code issue' },
  { type: FINDING_TYPE.DEPENDENCY, word: 'vulnerable package' },
];

export const NO_FINDINGS_LABEL = 'No findings';
