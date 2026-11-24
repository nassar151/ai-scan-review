import type { NextAction } from '@scan/shared';
import { useRef, useState } from 'react';
import { FindingsSection } from '../FindingsSection/FindingsSection';
import { NextActions } from '../NextActions/NextActions';
import { ResultsOverview } from '../ResultsOverview/ResultsOverview';
import { SeverityBreakdown } from '../SeverityBreakdown/SeverityBreakdown';
import { SCROLL_TO_FINDINGS } from './ScanResults.consts';
import type { ScanResultsProps } from './ScanResults.types';

export const ScanResults = ({ scan, result }: ScanResultsProps) => {
  const findingsRef = useRef<HTMLDivElement>(null);
  const [focusAction, setFocusAction] = useState<NextAction>();

  const handleShowFindings = (action: NextAction) => {
    setFocusAction(action);
    findingsRef.current?.scrollIntoView(SCROLL_TO_FINDINGS);
  };

  return (
    <div className="bear-flex bear-flex-col bear-gap-6">
      <ResultsOverview scan={scan} result={result} />
      <SeverityBreakdown result={result} />
      <div ref={findingsRef}>
        <FindingsSection
          findings={result.findings}
          focusAction={focusAction}
          onClearFocus={() => setFocusAction(undefined)}
        />
      </div>
      <NextActions actions={result.nextActions} onShowFindings={handleShowFindings} />
    </div>
  );
};
