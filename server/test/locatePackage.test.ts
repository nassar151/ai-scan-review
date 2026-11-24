import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { locatePackage } from '../src/scan-service/deps/locatePackage';

const PACKAGE_JSON = `{
  "dependencies": {
    "express": "^4.17.1",
    "lodash": "^4.17.15"
  }
}
`;

const PACKAGE_LOCK = `{
  "packages": {
    "node_modules/@types/lodash": {
      "version": "4.14.0"
    },
    "node_modules/lodash": {
      "version": "4.17.15"
    },
    "node_modules/qs": {
      "version": "6.7.0"
    }
  }
}
`;

describe('locatePackage', () => {
  let repoDir: string;

  beforeAll(async () => {
    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'locate-'));
    await fs.writeFile(path.join(repoDir, 'package.json'), PACKAGE_JSON);
    await fs.writeFile(path.join(repoDir, 'package-lock.json'), PACKAGE_LOCK);
  });

  afterAll(() => fs.rm(repoDir, { recursive: true, force: true }));

  it('points a direct dependency at its line in the manifest', async () => {
    const location = await locatePackage(repoDir, { name: 'lodash', version: '4.17.15', lockfile: 'package-lock.json', isDirect: true });
    expect(location).toEqual({ path: 'package.json', line: 4, endLine: 4, snippet: '"lodash": "^4.17.15"' });
  });

  it('points an indirect dependency at the lockfile entry with the matching version', async () => {
    const location = await locatePackage(repoDir, { name: 'qs', version: '6.7.0', lockfile: 'package-lock.json', isDirect: false });
    expect(location).toMatchObject({ path: 'package-lock.json', line: 9, endLine: 10 });
    expect(location.snippet).toBe('"node_modules/qs": {\n  "version": "6.7.0"');
  });

  it('skips a similarly named package whose version does not match', async () => {
    const location = await locatePackage(repoDir, { name: 'lodash', version: '4.17.15', lockfile: 'package-lock.json', isDirect: false });
    expect(location.line).toBe(6);
  });

  it('falls back to the lockfile path when the package is not found', async () => {
    const location = await locatePackage(repoDir, { name: 'missing', version: '1.0.0', lockfile: 'package-lock.json' });
    expect(location).toEqual({ path: 'package-lock.json' });
  });
});
