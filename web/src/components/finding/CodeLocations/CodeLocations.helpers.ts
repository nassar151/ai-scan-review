import { DEFAULT_LANGUAGE, LANGUAGE_BY_EXTENSION } from './CodeLocations.consts';

export const languageForPath = (path: string) =>
  LANGUAGE_BY_EXTENSION[path.split('.').pop()?.toLowerCase() ?? ''] ?? DEFAULT_LANGUAGE;
