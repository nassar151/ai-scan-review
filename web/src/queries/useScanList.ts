import { useQuery } from '@tanstack/react-query';
import { RECENT_SCANS_LIMIT } from '../api/api.consts';
import { listScans } from '../api/scans.api';
import { isTerminalStatus } from '../utils/scanStatus';
import { ACTIVE_LIST_REFRESH_MS, scanKeys } from './queries.consts';

export const useScanList = () =>
  useQuery({
    queryKey: scanKeys.list(),
    queryFn: ({ signal }) => listScans(RECENT_SCANS_LIMIT, signal),
    refetchInterval: (query) =>
      query.state.data?.some((scan) => !isTerminalStatus(scan.status)) ? ACTIVE_LIST_REFRESH_MS : false,
  });
