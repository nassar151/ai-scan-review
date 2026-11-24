import { Button, Card, CardBody, EmptyState, Typography } from '@forgedevstack/bear';
import { plural } from '../../../utils/text';
import { CardTitle } from '../../common/CardTitle/CardTitle';
import { PriorityBadge } from '../../common/PriorityBadge/PriorityBadge';
import type { NextActionsProps } from './NextActions.types';

export const NextActions = ({ actions, onShowFindings }: NextActionsProps) => (
  <Card padding="lg">
    <CardBody className="bear-flex bear-flex-col bear-gap-4">
      <CardTitle title="What to do next" subtitle="Ordered by impact. Each action can resolve several findings at once." />
      {actions.length === 0 ? (
        <EmptyState size="sm" title="Nothing to fix" description="No actionable risks were found in this repository." />
      ) : (
        <ol className="bear-flex bear-flex-col bear-gap-3">
          {actions.map((action, index) => (
            <li key={action.findingIds.join() || action.title} className="bear-flex bear-gap-4 bear-items-start">
              <span className="bear-flex bear-h-8 bear-w-8 bear-shrink-0 bear-items-center bear-justify-center bear-rounded-full bear-border bear-font-semibold bear-text-sm">
                {index + 1}
              </span>
              <div className="bear-flex-1 bear-min-w-0 bear-flex bear-flex-col bear-gap-1">
                <div className="bear-flex bear-items-center bear-gap-2 bear-flex-wrap">
                  <Typography weight="semibold">{action.title}</Typography>
                  <PriorityBadge priority={action.priority} />
                </div>
                <Typography variant="body2" color="muted">
                  {action.description}
                </Typography>
              </div>
              {action.findingIds.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => onShowFindings(action)}>
                  View {plural(action.findingIds.length, 'finding')}
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </CardBody>
  </Card>
);
