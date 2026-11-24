import { describe, expect, it } from 'vitest';
import { buildManifestOnlyGraph, buildNpmGraph } from '../src/scan-service/deps/lockfileGraph';

describe('buildNpmGraph (lockfile v3)', () => {
  const graph = buildNpmGraph(
    {
      lockfileVersion: 3,
      packages: {
        '': { dependencies: { express: '^4.0.0' }, devDependencies: { mocha: '^6.0.0' } },
        'node_modules/express': { version: '4.16.0', dependencies: { qs: '6.5.1', 'body-parser': '1.18.2' } },
        'node_modules/body-parser': { version: '1.18.2', dependencies: { qs: '6.5.1' } },
        'node_modules/qs': { version: '6.5.1' },
        'node_modules/mocha': { version: '6.2.0', dev: true, dependencies: { mkdirp: '0.5.1' } },
        'node_modules/mkdirp': { version: '0.5.1', dev: true, dependencies: { minimist: '0.0.8' } },
        'node_modules/mkdirp/node_modules/minimist': { version: '0.0.8', dev: true },
      },
    },
    {},
  );

  it('identifies direct production dependencies', () => {
    expect(graph.lookup('express', '4.16.0')).toEqual({ isDirect: true, isDev: false, introducedVia: [['express']] });
    expect(graph.directCount).toBe(2);
  });

  it('returns every chain that pulls in an indirect dependency, shortest first', () => {
    const context = graph.lookup('qs', '6.5.1');
    expect(context.isDirect).toBe(false);
    expect(context.introducedVia).toEqual([
      ['express', 'qs'],
      ['express', 'body-parser', 'qs'],
    ]);
  });

  it('resolves nested node_modules and marks dev-only packages', () => {
    expect(graph.lookup('minimist', '0.0.8')).toEqual({
      isDirect: false,
      isDev: true,
      introducedVia: [['mocha', 'mkdirp', 'minimist']],
    });
  });
});

describe('buildNpmGraph chain ordering', () => {
  it('lists chains from production dependencies before dev-only ones', () => {
    const graph = buildNpmGraph(
      {
        packages: {
          '': { dependencies: { forever: '1' }, devDependencies: { aa: '1' } },
          'node_modules/aa': { version: '1.0.0', dev: true, dependencies: { minimist: '1' } },
          'node_modules/forever': { version: '1.0.0', dependencies: { optimist: '1' } },
          'node_modules/optimist': { version: '1.0.0', dependencies: { minimist: '1' } },
          'node_modules/minimist': { version: '1.0.0' },
        },
      },
      {},
    );
    expect(graph.lookup('minimist', '1.0.0').introducedVia).toEqual([
      ['forever', 'optimist', 'minimist'],
      ['aa', 'minimist'],
    ]);
  });
});

describe('buildNpmGraph (lockfile v1)', () => {
  it('converts the nested tree and keeps dev flags', () => {
    const graph = buildNpmGraph(
      {
        lockfileVersion: 1,
        dependencies: {
          mocha: { version: '6.2.0', dev: true, requires: { mkdirp: '0.5.1' } },
          mkdirp: { version: '0.5.1', dev: true, requires: { minimist: '0.0.8' }, dependencies: { minimist: { version: '0.0.8', dev: true } } },
        },
      },
      { devDependencies: { mocha: '^6.0.0' } },
    );
    expect(graph.lookup('minimist', '0.0.8')).toMatchObject({ isDev: true, introducedVia: [['mocha', 'mkdirp', 'minimist']] });
  });
});

describe('buildManifestOnlyGraph', () => {
  it('knows only direct dependencies', () => {
    const graph = buildManifestOnlyGraph({ dependencies: { react: '^19' }, devDependencies: { vitest: '^5' } });
    expect(graph.lookup('vitest', '5.0.0')).toEqual({ isDirect: true, isDev: true, introducedVia: [['vitest']] });
    expect(graph.lookup('scheduler', '0.1.0')).toEqual({ isDirect: false, isDev: undefined, introducedVia: [] });
  });
});
