import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createScan } from '../api/scans.api';
import { scanKeys } from './queries.consts';

export const useStartScan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (repoUrl: string) => createScan({ repoUrl }),
    onSuccess: (scan) => {
      queryClient.setQueryData(scanKeys.detail(scan.id), scan);
      void queryClient.invalidateQueries({ queryKey: scanKeys.list() });
    },
  });
};
