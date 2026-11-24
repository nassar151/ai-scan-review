import type { RepoRef } from '@scan/shared';
import { HTTP_STATUS, HttpError } from '../../common/http/errors';
import {
  ALLOWED_PROTOCOLS,
  GITHUB_BASE_URL,
  GITHUB_HOSTS,
  GIT_SUFFIX,
  OWNER_PATTERN,
  REPO_PATTERN,
  RESERVED_REPO_NAMES,
  URL_EXAMPLE,
} from './githubUrl.consts';

const invalid = (details: string) =>
  new HttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid GitHub repository URL', details);

const toUrl = (input: string): URL => {
  try {
    return new URL(input);
  } catch {
    throw invalid(`Expected a URL like ${URL_EXAMPLE}`);
  }
};

/**
 * Accepts https://github.com/owner/repo and common variants (trailing slash, `.git`,
 * `/tree/<branch>` or other sub-paths) and returns the canonical repository reference.
 */
export const parseGithubUrl = (input: string): RepoRef => {
  const url = toUrl(input.trim());

  if (!ALLOWED_PROTOCOLS.includes(url.protocol) || !GITHUB_HOSTS.includes(url.hostname.toLowerCase())) {
    throw invalid(`Only public github.com repositories are supported, e.g. ${URL_EXAMPLE}`);
  }
  if (url.username || url.password) {
    throw invalid('URLs must not contain credentials');
  }

  const [owner = '', rawName = ''] = url.pathname.split('/').filter(Boolean);
  const name = rawName.replace(GIT_SUFFIX, '');

  if (!OWNER_PATTERN.test(owner) || !REPO_PATTERN.test(name) || RESERVED_REPO_NAMES.includes(name)) {
    throw invalid(`Expected a URL like ${URL_EXAMPLE}`);
  }

  return { owner, name, url: `${GITHUB_BASE_URL}/${owner}/${name}` };
};
