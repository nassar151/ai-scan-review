import type { BearThemeOverride } from '@forgedevstack/bear';

export const APP_COLOR_SCHEME = 'light';

/** White surfaces with a navy / sky-blue brand colour; Bear exposes these as --bear-* CSS variables. */
export const APP_THEME: BearThemeOverride = {
  colors: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0369a1',
      700: '#1e3a8a',
      800: '#172554',
      900: '#0f1d40',
      950: '#0a1430',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
    },
  },
};
