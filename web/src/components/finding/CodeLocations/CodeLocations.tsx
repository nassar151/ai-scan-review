import { CodeBlock, Typography } from '@forgedevstack/bear';
import { formatLocation } from '../../../utils/format';
import { plural } from '../../../utils/text';
import { Panel } from '../../common/Panel/Panel';
import { SNIPPET_MAX_HEIGHT } from './CodeLocations.consts';
import { languageForPath } from './CodeLocations.helpers';
import type { CodeLocationsProps } from './CodeLocations.types';

/** Where the problem is, in red: file:line and the flagged code (secrets masked). */
export const CodeLocations = ({ locations, occurrences }: CodeLocationsProps) => {
  const hidden = occurrences - locations.length;
  return (
    <Panel title={`Where (${plural(occurrences, 'place')})`} tone="danger">
      {locations.map((location) => {
        const title = formatLocation(location.path, location.line);
        return location.snippet ? (
          <CodeBlock
            key={title}
            title={title}
            code={location.snippet}
            language={languageForPath(location.path)}
            maxHeight={SNIPPET_MAX_HEIGHT}
            showLineNumbers={false}
            copyable
          />
        ) : (
          <Typography key={title} variant="body2" className="bear-font-mono">
            {title}
          </Typography>
        );
      })}
      {hidden > 0 && (
        <Typography variant="caption" color="muted">
          …and {plural(hidden, 'more place')} with the same pattern.
        </Typography>
      )}
    </Panel>
  );
};
