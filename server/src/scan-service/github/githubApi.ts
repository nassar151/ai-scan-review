import type { RepoRef } from '@scan/shared';

const GITHUB_API_URL = 'https://api.github.com';
const REQUEST_TIMEOUT_MS = 10_000;
const HTTP_NOT_FOUND = 404;
const KB_PER_MB = 1024;

interface GithubRepoResponse {
  private: boolean;
  default_branch: string;
  size: number;
  archived: boolean;
}

export interface RepoMetadata {
  defaultBranch: string;
  sizeMb: number;
  archived: boolean;
}

/**
 * Confirms the repository exists and is public before cloning.
 * Returns undefined when GitHub cannot be asked (rate limit, network) so the clone can still be attempted.
 */
export const fetchRepoMetadata = async (repo: RepoRef, token: string): Promise<RepoMetadata | undefined> => {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_URL}/repos/${repo.owner}/${repo.name}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ai-scan-review',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return undefined;
  }

  if (response.status === HTTP_NOT_FOUND) {
    throw new Error(`Repository ${repo.owner}/${repo.name} was not found, or it is private`);
  }
  if (!response.ok) {
    return undefined;
  }

  const body = (await response.json()) as GithubRepoResponse;
  if (body.private) {
    throw new Error('Private repositories are not supported');
  }
  return { defaultBranch: body.default_branch, sizeMb: body.size / KB_PER_MB, archived: body.archived };
};
