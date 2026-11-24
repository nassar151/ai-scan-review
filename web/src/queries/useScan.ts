import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ScanEvent } from '@scan/shared';
import { getScan, scanEventsUrl } from '../api/scans.api';
import { isTerminalStatus } from '../utils/scanStatus';
import { SCAN_POLL_FALLBACK_MS, scanKeys } from './queries.consts';

const parseScanEvent = (data: string): ScanEvent | undefined => {
  try {
    return JSON.parse(data) as ScanEvent;
  } catch {
    return undefined;
  }
};

/** Loads a scan and keeps it live: Server-Sent Events push every stage change into the query cache. */
export const useScan = (scanId: string) => {
  const queryClient = useQueryClient();
  const [isStreamDown, setIsStreamDown] = useState(false);

  const query = useQuery({
    queryKey: scanKeys.detail(scanId),
    queryFn: ({ signal }) => getScan(scanId, signal),
    refetchInterval: (current) =>
      isStreamDown && current.state.data && !isTerminalStatus(current.state.data.status)
        ? SCAN_POLL_FALLBACK_MS
        : false,
  });

  const isFinished = query.data ? isTerminalStatus(query.data.status) : false;
  const hasData = query.data !== undefined;

  useEffect(() => {
    if (!hasData || isFinished) return undefined;

    const source = new EventSource(scanEventsUrl(scanId));
    const handleMessage = (event: MessageEvent<string>) => {
      const scan = parseScanEvent(event.data)?.scan;
      if (!scan) return;
      queryClient.setQueryData(scanKeys.detail(scanId), scan);
      setIsStreamDown(false);
      if (isTerminalStatus(scan.status)) {
        source.close();
        void queryClient.invalidateQueries({ queryKey: scanKeys.list() });
      }
    };
    const handleError = () => setIsStreamDown(source.readyState === EventSource.CLOSED);

    source.addEventListener('message', handleMessage);
    source.addEventListener('error', handleError);
    return () => {
      source.removeEventListener('message', handleMessage);
      source.removeEventListener('error', handleError);
      source.close();
    };
  }, [scanId, hasData, isFinished, queryClient]);

  return query;
};
