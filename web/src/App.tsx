import { BearProvider } from '@forgedevstack/bear';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from './app/routes.consts';
import { AppLayout } from './components/layout/AppLayout/AppLayout';
import { HomePage } from './pages/HomePage/HomePage';
import { ScanPage } from './pages/ScanPage/ScanPage';
import { queryClient } from './queries/queryClient';
import { APP_COLOR_SCHEME, APP_THEME } from './theme/theme.consts';

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <BearProvider colorScheme={APP_COLOR_SCHEME} theme={APP_THEME}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path={ROUTES.HOME} element={<HomePage />} />
            <Route path={ROUTES.SCAN} element={<ScanPage />} />
            <Route path={ROUTES.NOT_FOUND} element={<Navigate to={ROUTES.HOME} replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </BearProvider>
  </QueryClientProvider>
);
