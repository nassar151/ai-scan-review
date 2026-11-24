import { Typography } from '@forgedevstack/bear';
import { useScanList } from '../../queries/useScanList';
import { RecentScans } from '../../components/home/RecentScans/RecentScans';
import { ScanForm } from '../../components/home/ScanForm/ScanForm';
import { HOW_IT_WORKS } from './HomePage.consts';

export const HomePage = () => {
  const scanList = useScanList();
  const scans = scanList.data ?? [];

  return (
    <div className="bear-flex bear-flex-col bear-gap-8">
      <div className="bear-flex bear-flex-col bear-gap-2">
        <Typography variant="h3" weight="bold">
          Know what to fix first
        </Typography>
        <Typography color="muted" lineHeight="relaxed">
          Paste a public GitHub repository. We scan the source code and every open-source dependency (npm, Python, Go, Java, Ruby, Rust, PHP, .NET and more),
          then turn the raw scanner output into a short list of risks, ranked by how exploitable they are in this repo,
          with clear next steps.
        </Typography>
      </div>

      <ScanForm />

      <div className="bear-grid bear-grid-cols-1 md:bear-grid-cols-3 bear-gap-4">
        {HOW_IT_WORKS.map((step) => (
          <div key={step.title} className="bear-flex bear-flex-col bear-gap-1">
            <Typography variant="subtitle2" weight="semibold">
              {step.title}
            </Typography>
            <Typography variant="body2" color="muted">
              {step.description}
            </Typography>
          </div>
        ))}
      </div>

      <RecentScans scans={scans} isLoading={scanList.isLoading} error={scanList.error} />
    </div>
  );
};
