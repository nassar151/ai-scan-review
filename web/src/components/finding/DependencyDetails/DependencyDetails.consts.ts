export const CHAIN_SEPARATOR = ' → ';
export const NO_FIX_LABEL = 'No fix published yet';

export const RELATIONSHIP_LABEL = {
  DIRECT: 'Direct (listed in your dependency file)',
  INDIRECT: 'Indirect (pulled in by another package)',
  UNKNOWN: 'Not recorded by this dependency file format',
} as const;
