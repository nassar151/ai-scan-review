import { FINDING_TYPE, PRIORITY, type Finding, type NextAction } from '@scan/shared';
import { plural } from '../utils/text';
import { ACTION_BREADTH_BONUS, MAX_LISTED_PACKAGES, MAX_MONITOR_ACTIONS } from './analysis.consts';
import { guideFor } from './ecosystemGuidance';
import { highestPriority, priorityRank } from './scoring';

interface ActionDraft extends NextAction {
  score: number;
}

const indirectUpgradeAdvice = (target: string, ecosystem: string) =>
  `Upgrade ${target} to a release that pulls in the fixed versions, or pin them with ${guideFor(ecosystem).pinMechanism} if no such release exists.`;

const secretActions = (findings: Finding[]): ActionDraft[] =>
  findings
    .filter((finding) => finding.type === FINDING_TYPE.SECRET)
    .map((finding) => ({
      title: `Rotate the exposed credential (${finding.title.replace(/^Hard-coded secret: /, '')})`,
      description: finding.recommendedAction,
      priority: finding.priority,
      findingIds: [finding.id],
      score: finding.riskScore,
    }));

const codeActions = (findings: Finding[]): ActionDraft[] =>
  findings
    .filter((finding) => finding.type === FINDING_TYPE.CODE)
    .map((finding) => ({
      title: `Fix ${finding.title} (${plural(finding.occurrences, 'place')})`,
      description: finding.recommendedAction,
      priority: finding.priority,
      findingIds: [finding.id],
      score: finding.riskScore,
    }));

/** Groups dependency fixes by the package the user actually upgrades (the direct dependency). */
const dependencyActions = (findings: Finding[]): ActionDraft[] => {
  const groups = new Map<string, { target: string; ecosystem: string; group: Finding[] }>();
  findings
    .filter((finding) => finding.type === FINDING_TYPE.DEPENDENCY && finding.dependency)
    .forEach((finding) => {
      const { ecosystem, isDirect, packageName, introducedVia } = finding.dependency!;
      const target = isDirect === false ? (introducedVia[0]?.[0] ?? packageName) : packageName;
      const key = `${ecosystem}:${target}`;
      const entry = groups.get(key) ?? { target, ecosystem, group: [] };
      groups.set(key, { ...entry, group: [...entry.group, finding] });
    });

  return [...groups.values()].map(({ target, ecosystem, group }) => {
    const advisoryCount = group.reduce((total, finding) => total + (finding.dependency?.advisories.length ?? 0), 0);
    const direct = group.find((finding) => finding.dependency?.packageName === target);
    const indirectNames = [
      ...new Set(group.filter((finding) => finding !== direct).map((finding) => finding.dependency!.packageName)),
    ];
    const title = direct?.dependency?.fixedVersion
      ? `Upgrade ${target} to ${direct.dependency.fixedVersion}`
      : `Upgrade ${target}`;
    const hiddenCount = indirectNames.length - MAX_LISTED_PACKAGES;
    const listed = `${indirectNames.slice(0, MAX_LISTED_PACKAGES).join(', ')}${hiddenCount > 0 ? ` +${hiddenCount} more` : ''}`;
    const fixes = indirectNames.length > 0 ? ` and its vulnerable dependencies (${listed})` : '';
    const how = direct ? direct.recommendedAction : indirectUpgradeAdvice(target, ecosystem);

    return {
      title,
      description: `Resolves ${plural(advisoryCount, 'known vulnerability')} in ${target}${fixes}. ${how}`,
      priority: highestPriority(group.map((finding) => finding.priority)),
      findingIds: group.map((finding) => finding.id),
      score: Math.max(...group.map((finding) => finding.riskScore)) + ACTION_BREADTH_BONUS * (group.length - 1),
    };
  });
};

/** Ordered to-do list with every fix-now and fix-soon action; "monitor" items only appear when nothing is urgent. */
export const buildNextActions = (findings: Finding[]): NextAction[] => {
  const drafts = [...secretActions(findings), ...codeActions(findings), ...dependencyActions(findings)].sort(
    (a, b) => priorityRank(a.priority) - priorityRank(b.priority) || b.score - a.score,
  );
  const urgent = drafts.filter((draft) => draft.priority !== PRIORITY.MONITOR);
  const chosen = urgent.length > 0 ? urgent : drafts.slice(0, MAX_MONITOR_ACTIONS);
  return chosen.map(({ score: _score, ...action }) => action);
};
