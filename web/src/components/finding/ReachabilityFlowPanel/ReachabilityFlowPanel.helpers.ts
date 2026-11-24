import { REACHABILITY, type FindingInvestigation, type InvestigationEvidence } from '@scan/shared';
import { formatLocation } from '../../../utils/format';
import { plural } from '../../../utils/text';

/** "path:line" for code evidence, `search "x" → N matches` for searches the agent ran. */
export const evidenceSource = (evidence: InvestigationEvidence) =>
  evidence.searchPattern !== undefined
    ? `search "${evidence.searchPattern}" → ${plural(evidence.matchCount ?? 0, 'match')}`
    : formatLocation(evidence.path ?? '', evidence.line);

/** The attack path is shown before the AI runs and when it finds the issue reachable; otherwise only the reason is. */
export const showsAttackPath = (investigation: FindingInvestigation | undefined) =>
  !investigation || investigation.reachability === REACHABILITY.REACHABLE;
