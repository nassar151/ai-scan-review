export const GITHUB_HOSTS = ['github.com', 'www.github.com'];
export const GITHUB_BASE_URL = 'https://github.com';
export const ALLOWED_PROTOCOLS = ['https:', 'http:'];

/** GitHub username rules: alphanumeric or single hyphens, max 39 chars, no leading hyphen. */
export const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
export const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
export const RESERVED_REPO_NAMES = ['.', '..'];
export const GIT_SUFFIX = /\.git$/i;

export const URL_EXAMPLE = 'https://github.com/owner/repository';
