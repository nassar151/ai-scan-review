import { describe, expect, it } from 'vitest';
import { parseGithubUrl } from '../src/scan-service/github/githubUrl';

const CANONICAL = 'https://github.com/expressjs/express';

describe('parseGithubUrl', () => {
  it.each([
    'https://github.com/expressjs/express',
    'https://github.com/expressjs/express/',
    'https://github.com/expressjs/express.git',
    'https://www.github.com/expressjs/express',
    'http://github.com/expressjs/express',
    'https://github.com/expressjs/express/tree/master/lib',
    '  https://github.com/expressjs/express  ',
  ])('normalizes %s', (input) => {
    expect(parseGithubUrl(input)).toEqual({ owner: 'expressjs', name: 'express', url: CANONICAL });
  });

  it.each([
    'not a url',
    'https://gitlab.com/expressjs/express',
    'https://github.com/expressjs',
    'https://github.com/',
    'https://user:token@github.com/expressjs/express',
    'ftp://github.com/expressjs/express',
    'https://github.com/-bad/express',
    'https://github.com/expressjs/..',
  ])('rejects %s', (input) => {
    expect(() => parseGithubUrl(input)).toThrow('Invalid GitHub repository URL');
  });
});
