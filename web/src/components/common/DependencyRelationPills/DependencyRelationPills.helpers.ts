import type { DependencyInfo } from '@scan/shared';
import { RELATION_PILL, VIA_PREFIX } from './DependencyRelationPills.consts';
import type { RelationPill } from './DependencyRelationPills.types';

const relationPill = ({ isDirect, introducedVia }: DependencyInfo): RelationPill | undefined => {
  if (isDirect === undefined) return undefined;
  if (isDirect) return RELATION_PILL.DIRECT;
  const parent = introducedVia[0]?.[0];
  return parent ? { ...RELATION_PILL.INDIRECT, hint: `${VIA_PREFIX}${parent}` } : RELATION_PILL.INDIRECT;
};

/** Direct / indirect (left out when the file format does not record it), plus "Dev only". */
export const relationPills = (dependency: DependencyInfo): RelationPill[] =>
  [relationPill(dependency), dependency.isDev ? RELATION_PILL.DEV : undefined].filter(
    (pill): pill is RelationPill => pill !== undefined,
  );
