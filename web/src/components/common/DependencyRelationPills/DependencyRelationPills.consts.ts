export const RELATION_PILL = {
  DIRECT: { label: 'Direct', variant: 'primary', hint: 'Listed in your own dependency file' },
  INDIRECT: { label: 'Indirect', variant: 'secondary', hint: 'Pulled in by another package' },
  DEV: { label: 'Dev only', variant: 'neutral', hint: 'Development dependency, not shipped to production' },
} as const;

export const VIA_PREFIX = 'Pulled in by ';
