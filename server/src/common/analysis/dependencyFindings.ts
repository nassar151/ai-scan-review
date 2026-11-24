import { createHash } from 'node:crypto';
import {
  CONFIDENCE,
  EFFORT,
  FINDING_TYPE,
  SCANNER_TOOL,
  SEVERITY,
  type Advisory,
  type CodeLocation,
  type Effort,
  type Finding,
  type Severity,
} from '@scan/shared';
import { ADJUSTMENT, BASE_SCORE, CVSS_TO_SCORE_FACTOR, MANY_ADVISORIES_THRESHOLD } from './analysis.consts';
import type { RawAdvisory, VulnerablePackage } from './analysis.types';
import { cvss3BaseScore, explainCvssVector, isRemoteUnauthenticated, severityFromScore } from './cvss';
import { guideFor } from './ecosystemGuidance';
import {
  highestSeverity,
  priorityFromScore,
  scoreWithFactors,
  severityFromRiskScore,
  severityRank,
  withScoreSeverityNote,
  type RiskFactor,
} from './scoring';
import { highestVersion, upgradeType } from './versions';

const DATABASE_SEVERITY: Record<string, Severity> = {
  CRITICAL: SEVERITY.CRITICAL,
  HIGH: SEVERITY.HIGH,
  MODERATE: SEVERITY.MEDIUM,
  MEDIUM: SEVERITY.MEDIUM,
  LOW: SEVERITY.LOW,
};
const CVE_PREFIX = 'CVE-';
const GHSA_PREFIX = 'GHSA-';
const MAJOR_UPGRADE = 'major';
const ID_HASH_LENGTH = 12;

const advisoryUrl = (id: string) =>
  id.startsWith(GHSA_PREFIX) ? `https://github.com/advisories/${id}` : `https://osv.dev/vulnerability/${id}`;

const scoreFor = (raw: RawAdvisory) => (raw.cvssVector ? cvss3BaseScore(raw.cvssVector) : undefined) ?? raw.groupScore;

const severityReasonFor = (raw: RawAdvisory, severity: Severity, score: number | undefined) => {
  const label = severity.toUpperCase();
  const reading = raw.cvssVector ? explainCvssVector(raw.cvssVector) : undefined;
  if (score !== undefined && reading) return `${label} (CVSS ${score.toFixed(1)}). ${reading}`;
  if (score !== undefined) return `${label} (CVSS ${score.toFixed(1)}).`;
  return raw.databaseSeverity
    ? `${label}: rated ${raw.databaseSeverity} by the GitHub Advisory Database (no CVSS vector published).`
    : `${label}: no severity score was published; treated as medium by default.`;
};

export const toAdvisory = (raw: RawAdvisory): Advisory => {
  const score = scoreFor(raw);
  const severity =
    score !== undefined
      ? severityFromScore(score)
      : (DATABASE_SEVERITY[raw.databaseSeverity?.toUpperCase() ?? ''] ?? SEVERITY.MEDIUM);

  return {
    id: raw.id,
    cveIds: [raw.id, ...raw.aliases].filter((id) => id.startsWith(CVE_PREFIX)),
    title: raw.summary,
    description: raw.details,
    severity,
    cvssScore: score,
    cvssVector: raw.cvssVector,
    severityReason: severityReasonFor(raw, severity, score),
    fixedVersion: raw.fixedVersion,
    cwe: raw.cwe,
    publishedAt: raw.publishedAt,
    url: advisoryUrl(raw.id),
  };
};

const sortAdvisories = (advisories: Advisory[]) =>
  [...advisories].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity) || (b.cvssScore ?? 0) - (a.cvssScore ?? 0),
  );

const effortFor = (pkg: VulnerablePackage, fixAvailable: boolean, upgrade: string | undefined): Effort => {
  if (!fixAvailable) return EFFORT.LARGE;
  if (pkg.isDirect !== true || upgrade === MAJOR_UPGRADE) return EFFORT.MEDIUM;
  return EFFORT.SMALL;
};

const topParent = (pkg: VulnerablePackage) => pkg.introducedVia[0]?.[0];

const recommendedActionFor = (pkg: VulnerablePackage, fixedVersion: string | undefined, fixAvailable: boolean) => {
  const parent = topParent(pkg);
  if (!fixAvailable) {
    return fixedVersion
      ? `Upgrade ${pkg.name} to at least ${fixedVersion} to fix the advisories that have a patch; the rest have no fix yet, so consider replacing ${pkg.name} or limiting its exposure.`
      : `No patched version of ${pkg.name} exists yet. Consider replacing it, removing the feature that uses it, or limiting untrusted input reaching it; watch the advisory for a fix.`;
  }
  if (pkg.isDirect !== false) {
    return `Upgrade ${pkg.name} from ${pkg.version} to ${fixedVersion} or later.`;
  }
  const via = parent ? `Upgrade ${parent} to a version that depends on ${pkg.name} >= ${fixedVersion}` : `Update the package that depends on ${pkg.name}`;
  return `${via}, or ${guideFor(pkg.ecosystem).pinClause(pkg.name, fixedVersion!)}.`;
};

const fixStepsFor = (pkg: VulnerablePackage, fixedVersion: string | undefined, fixAvailable: boolean) => {
  const parent = topParent(pkg);
  const guide = guideFor(pkg.ecosystem);
  if (!fixAvailable || !fixedVersion) {
    return [
      `Check whether your code actually uses the vulnerable feature of ${pkg.name}.`,
      'Limit untrusted input reaching it, or replace the package with a maintained alternative.',
      'Subscribe to the advisory and upgrade as soon as a fix is released.',
    ];
  }
  if (pkg.isDirect === true) {
    return [guide.upgradeStep(pkg.name, fixedVersion), 'Run your test suite to catch breaking changes.', 'Re-run the scan to confirm.'];
  }
  if (pkg.isDirect === undefined) {
    return [
      guide.upgradeStep(pkg.name, fixedVersion),
      `If ${pkg.name} is not listed in your own dependency file, another package pulls it in: upgrade that package, or ${guide.pinClause(pkg.name, fixedVersion)}.`,
      'Run your test suite, then re-run the scan to confirm.',
    ];
  }
  return [
    parent ? guide.updateParentStep(parent) : `Update the packages that depend on ${pkg.name}.`,
    `If ${pkg.name} is still below ${fixedVersion}, ${guide.pinClause(pkg.name, fixedVersion)}.`,
    'Run your test suite, then re-run the scan to confirm.',
  ];
};

const relationFactor = (pkg: VulnerablePackage): RiskFactor[] => {
  if (pkg.isDirect === undefined) return [];
  return pkg.isDirect
    ? [{ label: 'Direct dependency', points: ADJUSTMENT.DIRECT_DEPENDENCY }]
    : [{ label: `Indirect dependency${topParent(pkg) ? ` via ${topParent(pkg)}` : ''}`, points: ADJUSTMENT.INDIRECT_DEPENDENCY }];
};

const riskFactorsFor = (pkg: VulnerablePackage, advisories: Advisory[], fixAvailable: boolean): RiskFactor[] => {
  const factors: RiskFactor[] = [
    pkg.isDev
      ? { label: 'Dev dependency only, not shipped to production', points: ADJUSTMENT.DEV_ONLY }
      : { label: 'Production dependency', points: 0 },
    ...relationFactor(pkg),
  ];
  if (advisories.some((advisory) => isRemoteUnauthenticated(advisory.cvssVector))) {
    factors.push({ label: 'Remotely exploitable without login', points: ADJUSTMENT.REMOTE_NO_AUTH });
  }
  if (advisories.length >= MANY_ADVISORIES_THRESHOLD) {
    factors.push({ label: `${advisories.length} known vulnerabilities in this version`, points: ADJUSTMENT.MANY_ADVISORIES });
  }
  factors.push(fixAvailable ? { label: 'Fix available', points: 0 } : { label: 'No complete fix available', points: 0 });
  return factors;
};

/** Direct anywhere wins; otherwise indirect if any file knows; unknown only when no file says. */
const mergeIsDirect = (a: boolean | undefined, b: boolean | undefined) => (a || b ? true : (a ?? b));

const mergeByVersion = (packages: VulnerablePackage[]) => {
  const merged = new Map<string, { pkg: VulnerablePackage; lockfiles: Set<string>; locations: Map<string, CodeLocation> }>();
  packages.forEach((pkg) => {
    const key = `${pkg.ecosystem}:${pkg.name}@${pkg.version}`;
    const location = pkg.location ?? { path: pkg.lockfile };
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        pkg: { ...pkg, advisories: [...pkg.advisories], introducedVia: [...pkg.introducedVia] },
        lockfiles: new Set([pkg.lockfile]),
        locations: new Map([[location.path, location]]),
      });
      return;
    }
    existing.lockfiles.add(pkg.lockfile);
    if (!existing.locations.has(location.path)) existing.locations.set(location.path, location);
    existing.pkg.isDirect = mergeIsDirect(existing.pkg.isDirect, pkg.isDirect);
    existing.pkg.isDev &&= pkg.isDev;
    existing.pkg.introducedVia = [...existing.pkg.introducedVia, ...pkg.introducedVia];
    const known = new Set(existing.pkg.advisories.map((advisory) => advisory.id));
    existing.pkg.advisories.push(...pkg.advisories.filter((advisory) => !known.has(advisory.id)));
  });
  return [...merged.values()];
};

const buildFinding = (pkg: VulnerablePackage, lockfiles: string[], locations: CodeLocation[]): Finding => {
  const advisories = sortAdvisories(pkg.advisories.map(toAdvisory));
  const lead = advisories[0]!;
  const scannerSeverity = highestSeverity(advisories.map((advisory) => advisory.severity));
  const fixes = advisories.map((advisory) => advisory.fixedVersion).filter((version): version is string => Boolean(version));
  const fixAvailable = fixes.length === advisories.length;
  const fixedVersion = highestVersion(fixes);
  const upgrade = fixedVersion ? upgradeType(pkg.version, fixedVersion) : undefined;

  const base = lead.cvssScore !== undefined ? lead.cvssScore * CVSS_TO_SCORE_FACTOR : BASE_SCORE[scannerSeverity];
  const { riskScore, riskFactors } = scoreWithFactors(base, riskFactorsFor(pkg, advisories, fixAvailable));
  const severity = severityFromRiskScore(riskScore);
  const extra = advisories.length > 1 ? ` (+${advisories.length - 1} more)` : '';
  const exposure = pkg.isDev
    ? `${pkg.name} is only used for development, so it is not part of what you ship.`
    : `${pkg.name} is part of your production dependency tree${pkg.isDirect === false ? ` (pulled in by ${topParent(pkg) ?? 'another package'})` : ''}.`;

  return {
    id: createHash('sha1').update(`dep:${pkg.ecosystem}:${pkg.name}@${pkg.version}`).digest('hex').slice(0, ID_HASH_LENGTH),
    type: FINDING_TYPE.DEPENDENCY,
    title: `${pkg.name}@${pkg.version}: ${lead.title}${extra}`,
    description: advisories.map((advisory) => `• ${advisory.title}`).join('\n'),
    severity,
    severityReason: withScoreSeverityNote(
      `${lead.severityReason}${advisories.length > 1 ? ` This is the most severe of ${advisories.length} advisories affecting this version.` : ''}`,
      scannerSeverity,
      severity,
      riskScore,
    ),
    riskScore,
    priority: priorityFromScore(riskScore),
    confidence: CONFIDENCE.HIGH,
    whyItMatters: `${exposure} ${lead.title}.`,
    recommendedAction: recommendedActionFor(pkg, fixedVersion, fixAvailable),
    fixSteps: fixStepsFor(pkg, fixedVersion, fixAvailable),
    effort: effortFor(pkg, fixAvailable, upgrade),
    fixAvailable,
    riskFactors,
    locations,
    occurrences: locations.length,
    dependency: {
      ecosystem: pkg.ecosystem,
      packageName: pkg.name,
      installedVersion: pkg.version,
      fixedVersion,
      upgradeType: upgrade,
      isDirect: pkg.isDirect,
      isDev: pkg.isDev,
      introducedVia: pkg.introducedVia,
      manifests: lockfiles,
      advisories,
    },
    cwe: [...new Set(advisories.flatMap((advisory) => advisory.cwe))],
    owasp: [],
    references: advisories.map((advisory) => ({ label: advisory.cveIds[0] ?? advisory.id, url: advisory.url })),
    source: SCANNER_TOOL.OSV_SCANNER,
    ruleIds: advisories.map((advisory) => advisory.id),
  };
};

/** One finding per vulnerable package version, holding every advisory (CVE/GHSA) that affects it. */
export const buildDependencyFindings = (packages: VulnerablePackage[]): Finding[] =>
  mergeByVersion(packages).map(({ pkg, lockfiles, locations }) => buildFinding(pkg, [...lockfiles], [...locations.values()]));
