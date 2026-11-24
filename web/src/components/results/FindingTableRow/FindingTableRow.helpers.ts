import type { Finding } from '@scan/shared';
import { EFFORT_LABEL } from '../../../theme/display.consts';
import { CELL_LABEL, MAX_ROW_IDENTIFIERS } from './FindingTableRow.consts';
import type { CellText } from './FindingTableRow.types';

const withOverflow = (ids: string[]): CellText => {
  if (ids.length === 0) return { primary: CELL_LABEL.NONE };
  const extra = ids.length - MAX_ROW_IDENTIFIERS;
  return {
    primary: ids.slice(0, MAX_ROW_IDENTIFIERS).join(', '),
    secondary: extra > 0 ? `+${extra} more` : undefined,
  };
};

/** CVE ids (or GHSA when there is no CVE) for dependencies, CWE ids for code. */
export const identifiersCell = ({ dependency, cwe }: Finding): CellText =>
  withOverflow(
    dependency
      ? dependency.advisories.flatMap((advisory) => (advisory.cveIds.length ? advisory.cveIds : [advisory.id]))
      : cwe,
  );

export const fixCell = ({ dependency, effort }: Finding): CellText => {
  if (!dependency) return { primary: EFFORT_LABEL[effort] };
  if (!dependency.fixedVersion) return { primary: CELL_LABEL.NO_FIX };
  return { primary: `→ ${dependency.fixedVersion}`, secondary: dependency.upgradeType };
};
