import { CodeBlock, Typography } from '@forgedevstack/bear';
import { Panel } from '../../common/Panel/Panel';
import { SNIPPET_MAX_HEIGHT } from '../CodeLocations/CodeLocations.consts';
import { languageForPath } from '../CodeLocations/CodeLocations.helpers';
import { AI_FIX_NOTE, AI_FIX_TITLE } from './AiFixPanel.consts';
import type { AiFixPanelProps } from './AiFixPanel.types';

/** The replacement code the agent proposed for the flagged lines, in green. */
export const AiFixPanel = ({ fix, model }: AiFixPanelProps) => {
  const range = fix.startLine === fix.endLine ? `${fix.startLine}` : `${fix.startLine}-${fix.endLine}`;
  return (
    <Panel title={AI_FIX_TITLE} caption={model} tone="success">
      {fix.explanation && (
        <Typography variant="body2" weight="semibold" lineHeight="relaxed">
          {fix.explanation}
        </Typography>
      )}
      <CodeBlock
        title={`${fix.path}:${range}`}
        code={fix.fixedCode}
        language={languageForPath(fix.path)}
        maxHeight={SNIPPET_MAX_HEIGHT}
        showLineNumbers={false}
        copyable
      />
      <Typography variant="caption" color="muted">
        {AI_FIX_NOTE}
      </Typography>
    </Panel>
  );
};
