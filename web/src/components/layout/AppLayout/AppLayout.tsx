import { Link, Typography } from '@forgedevstack/bear';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import { ROUTES } from '../../../app/routes.consts';
import { BRAND_ACCENT } from '../../../theme/display.consts';
import { APP_TAGLINE, APP_TITLE, HEADER_TEXT_COLOR, OSV_SCANNER_URL, SEMGREP_URL } from './AppLayout.consts';

export const AppLayout = () => (
  <div className="bear-min-h-screen bear-flex bear-flex-col">
    <header className="bear-sticky bear-top-0 bear-z-10 bear-bg-primary-700 bear-shadow-sm">
      <div className="bear-max-w-7xl bear-mx-auto bear-w-full bear-px-6 bear-py-4 bear-flex bear-items-center bear-justify-between bear-gap-4">
        <RouterLink to={ROUTES.HOME} className="bear-no-underline">
          <Typography variant="h6" weight="bold" component="span" color={HEADER_TEXT_COLOR}>
            {APP_TITLE}
          </Typography>
        </RouterLink>
        <Typography variant="caption" color={HEADER_TEXT_COLOR}>
          {APP_TAGLINE}
        </Typography>
      </div>
    </header>
    <main className="bear-flex-1 bear-max-w-7xl bear-mx-auto bear-w-full bear-px-6 bear-py-8">
      <Outlet />
    </main>
    <footer className="bear-max-w-7xl bear-mx-auto bear-w-full bear-px-6 bear-py-6">
      <Typography variant="caption" color="muted">
        Powered by{' '}
        <Link href={SEMGREP_URL} external color={BRAND_ACCENT}>
          Semgrep
        </Link>
        ,{' '}
        <Link href={OSV_SCANNER_URL} external color={BRAND_ACCENT}>
          OSV-Scanner
        </Link>{' '}
        and an LLM (GroqCloud, xAI Grok or OpenAI).
      </Typography>
    </footer>
  </div>
);
