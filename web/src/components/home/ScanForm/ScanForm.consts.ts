export const REPO_URL_PLACEHOLDER = 'https://github.com/owner/repository';

export const START_SCAN_ERROR_HINT = `Check the URL and try again. It should look like ${REPO_URL_PLACEHOLDER}`;

export const EXAMPLE_REPOS = [
  { label: 'OWASP/NodeGoat', url: 'https://github.com/OWASP/NodeGoat' },
  { label: 'expressjs/express', url: 'https://github.com/expressjs/express' },
  { label: 'cr0hn/vulnerable-node', url: 'https://github.com/cr0hn/vulnerable-node' },
] as const;
