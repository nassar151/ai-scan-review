import { Alert, Button, Card, CardBody, Chip, Input, Typography } from '@forgedevstack/bear';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanPath } from '../../../app/routes.helpers';
import { useStartScan } from '../../../queries/useStartScan';
import { EXAMPLE_REPOS, REPO_URL_PLACEHOLDER } from './ScanForm.consts';
import { startScanErrorDetails } from './ScanForm.helpers';

export const ScanForm = () => {
  const navigate = useNavigate();
  const startScan = useStartScan();
  const [repoUrl, setRepoUrl] = useState('');
  const trimmedUrl = repoUrl.trim();

  const changeUrl = (url: string) => {
    setRepoUrl(url);
    startScan.reset();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedUrl) return;
    startScan.mutate(trimmedUrl, { onSuccess: (scan) => navigate(scanPath(scan.id)) });
  };

  return (
    <Card padding="lg">
      <CardBody>
        <form onSubmit={handleSubmit} className="bear-flex bear-flex-col bear-gap-4">
          <div className="bear-flex bear-flex-col md:bear-flex-row bear-gap-3 md:bear-items-start">
            <div className="bear-flex-1">
              <Input
                label="Public GitHub repository"
                placeholder={REPO_URL_PLACEHOLDER}
                value={repoUrl}
                onChange={(event) => changeUrl(event.target.value)}
                fullWidth
                size="lg"
              />
            </div>
            <div className="md:bear-pt-6">
              <Button
                type="submit"
                size="lg"
                loading={startScan.isPending}
                loadingText="Starting…"
                disabled={!trimmedUrl}
              >
                Start scan
              </Button>
            </div>
          </div>

          {startScan.error && (
            <Alert severity="error" variant="filled" title={startScan.error.message} closable onClose={startScan.reset}>
              {startScanErrorDetails(startScan.error)}
            </Alert>
          )}

          <div className="bear-flex bear-flex-wrap bear-items-center bear-gap-2">
            <Typography variant="caption" color="muted">
              Try:
            </Typography>
            {EXAMPLE_REPOS.map((example) => (
              <Chip key={example.url} size="sm" variant="soft" color="primary" onClick={() => changeUrl(example.url)}>
                {example.label}
              </Chip>
            ))}
          </div>
        </form>
      </CardBody>
    </Card>
  );
};
