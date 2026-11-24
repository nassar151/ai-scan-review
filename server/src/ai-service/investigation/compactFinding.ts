import type { Finding } from '@scan/shared';
import { MAX_ADVISORY_DETAILS_CHARS, MAX_LOCATIONS_FOR_AI, MAX_PATHS_FOR_AI, MAX_SNIPPET_CHARS } from './investigation.consts';

const truncate = (text: string | undefined, max: number) =>
  text && text.length > max ? `${text.slice(0, max)}…` : text;

/** The finding as the agent sees it: already-masked, truncated data only, no full files and no unmasked secrets. */
export const compactFinding = (finding: Finding) => ({
  id: finding.id,
  type: finding.type,
  title: finding.title,
  description: finding.description,
  severity: finding.severity,
  severityReason: finding.severityReason,
  priority: finding.priority,
  riskFactors: finding.riskFactors,
  effort: finding.effort,
  fixAvailable: finding.fixAvailable,
  occurrences: finding.occurrences,
  cwe: finding.cwe,
  locations: finding.locations.slice(0, MAX_LOCATIONS_FOR_AI).map((location) => ({
    path: location.path,
    line: location.line,
    snippet: truncate(location.snippet, MAX_SNIPPET_CHARS),
  })),
  dependency: finding.dependency && {
    ecosystem: finding.dependency.ecosystem,
    package: finding.dependency.packageName,
    installedVersion: finding.dependency.installedVersion,
    fixedVersion: finding.dependency.fixedVersion,
    upgradeType: finding.dependency.upgradeType,
    isDirect: finding.dependency.isDirect,
    isDevOnly: finding.dependency.isDev,
    introducedVia: finding.dependency.introducedVia.slice(0, MAX_PATHS_FOR_AI).map((chain) => chain.join(' > ')),
    advisories: finding.dependency.advisories.map((advisory) => ({
      id: advisory.id,
      cveIds: advisory.cveIds,
      title: advisory.title,
      severity: advisory.severity,
      fixedVersion: advisory.fixedVersion,
      details: truncate(advisory.description, MAX_ADVISORY_DETAILS_CHARS),
    })),
  },
  suggestedAction: finding.recommendedAction,
});
