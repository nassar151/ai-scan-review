import type { DirectDependencies } from './lockfileGraph.types';

const GO_REQUIRE_BLOCK_START = /^require\s*\($/;
const GO_SINGLE_REQUIRE = /^require\s+(\S+)\s+v\S+(.*)$/;
const GO_BLOCK_ENTRY = /^(\S+)\s+v\S+(.*)$/;
const GO_INDIRECT_MARKER = /\/\/\s*indirect/;
const GEMFILE_DEPENDENCIES_HEADER = 'DEPENDENCIES';
const GEMFILE_ENTRY = /^\s{2}([A-Za-z0-9_.-]+)/;
const REQUIREMENT_NAME = /^([A-Za-z0-9][A-Za-z0-9._-]*)/;
const COMMENT_MARKER = '#';
const PIP_COMPILE_VIA = /(^|\s)via\b/;
const PIP_COMPILE_DIRECT_SOURCE = /(^|\s)-r\s|\(pyproject\.toml\)|\(setup\.(py|cfg)\)/;
const PIP_COMPILE_SOURCE_FILES = /-[rc]\s+\S+|\S+\s+\((pyproject\.toml|setup\.(py|cfg))\)/g;
const PIP_COMPILE_VIA_WORD = 'via';
const GEM_SPEC = /^ {4}([A-Za-z0-9_.-]+) \(/;
const GEM_SPEC_DEPENDENCY = /^ {6}([A-Za-z0-9_.-]+)/;
const POM_DEPENDENCY = /<dependency>([\s\S]*?)<\/dependency>/g;
const POM_TEST_SCOPES = new Set(['test', 'provided']);
/** Real packages are "vendor/name"; platform entries (php, ext-json, lib-icu, composer-plugin-api) have no slash. */
const COMPOSER_VENDOR_SEPARATOR = '/';
const PYPI_SEPARATORS = /[-_.]+/g;

const tagValue = (xml: string, tag: string) => new RegExp(`<${tag}>\\s*([^<]+?)\\s*</${tag}>`).exec(xml)?.[1];

/** PEP 503 name normalization, so "Flask_Login" and "flask-login" match. */
export const normalizePypiName = (name: string) => name.toLowerCase().replace(PYPI_SEPARATORS, '-');

/** go.mod: requirements without "// indirect" are direct (Go 1.17+ lists indirect ones too). */
export const parseGoMod = (text: string): DirectDependencies => {
  const prod: string[] = [];
  let inBlock = false;
  text.split('\n').forEach((rawLine) => {
    const line = rawLine.trim();
    if (GO_REQUIRE_BLOCK_START.test(line)) {
      inBlock = true;
      return;
    }
    if (inBlock && line === ')') {
      inBlock = false;
      return;
    }
    const match = inBlock ? GO_BLOCK_ENTRY.exec(line) : GO_SINGLE_REQUIRE.exec(line);
    if (match && !GO_INDIRECT_MARKER.test(match[2] ?? '')) prod.push(match[1]!);
  });
  return { prod, dev: [] };
};

/** specs: sections list each gem at 4 spaces and the gems it requires at 6 spaces. */
const parseGemSpecs = (lines: string[]) => {
  const parents: Record<string, string[]> = {};
  let current: string | undefined;
  lines.forEach((line) => {
    const spec = GEM_SPEC.exec(line)?.[1];
    if (spec) {
      current = spec;
      return;
    }
    const child = GEM_SPEC_DEPENDENCY.exec(line)?.[1];
    if (child && current) parents[child] = [...(parents[child] ?? []), current];
    else if (!child) current = undefined;
  });
  return parents;
};

/** Gemfile.lock: DEPENDENCIES lists the gems named in the Gemfile; specs: records who requires what. */
export const parseGemfileLock = (text: string): DirectDependencies => {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trim() === GEMFILE_DEPENDENCIES_HEADER);
  if (start === -1) return { prod: [], dev: [] };
  const end = lines.findIndex((line, index) => index > start && line.trim() === '');
  const prod = lines
    .slice(start + 1, end === -1 ? undefined : end)
    .flatMap((line) => GEMFILE_ENTRY.exec(line)?.[1] ?? []);
  return { prod, dev: [], parents: parseGemSpecs(lines.slice(0, start)) };
};

/** Package names in a pip-compile "via" comment, without the -r/-c files and the project itself. */
const viaPackages = (via: string) =>
  via
    .replace(PIP_COMPILE_SOURCE_FILES, ' ')
    .split(/\s+/)
    .filter((token) => token && token !== PIP_COMPILE_VIA_WORD && REQUIREMENT_NAME.test(token))
    .map(normalizePypiName);

/**
 * requirements.txt: options (-r, -e, --hash) are skipped. Hand-written files list only direct packages.
 * pip-compile output lists everything with "# via" comments; only packages via -r / pyproject.toml / setup.py are direct.
 */
export const parseRequirements = (text: string): DirectDependencies => {
  const entries: { name: string; via: string }[] = [];
  text.split('\n').forEach((rawLine) => {
    const [code = '', ...commentParts] = rawLine.split(COMMENT_MARKER);
    const requirement = code.trim();
    const comment = commentParts.join(COMMENT_MARKER).trim();
    const name = requirement.startsWith('-') ? undefined : REQUIREMENT_NAME.exec(requirement)?.[1];
    if (name) {
      entries.push({ name: normalizePypiName(name), via: comment });
      return;
    }
    const last = entries.at(-1);
    if (last && !requirement) last.via = `${last.via} ${comment}`;
  });
  const compiled = entries.some((entry) => PIP_COMPILE_VIA.test(entry.via));
  return {
    prod: entries.filter((entry) => !compiled || PIP_COMPILE_DIRECT_SOURCE.test(entry.via)).map((entry) => entry.name),
    dev: [],
    parents: compiled ? Object.fromEntries(entries.map((entry) => [entry.name, viaPackages(entry.via)])) : undefined,
  };
};

/** pom.xml: declared dependencies are direct; test/provided scopes are not shipped. Names use OSV's "group:artifact". */
export const parsePom = (text: string): DirectDependencies => {
  const prod: string[] = [];
  const dev: string[] = [];
  for (const [, block] of text.matchAll(POM_DEPENDENCY)) {
    const groupId = tagValue(block!, 'groupId');
    const artifactId = tagValue(block!, 'artifactId');
    if (!groupId || !artifactId) continue;
    const scope = tagValue(block!, 'scope');
    (scope && POM_TEST_SCOPES.has(scope) ? dev : prod).push(`${groupId}:${artifactId}`);
  }
  return { prod, dev };
};

/** composer.json next to composer.lock: "require" ships, "require-dev" does not. */
export const parseComposerJson = (manifest: { require?: object; 'require-dev'?: object }): DirectDependencies => {
  const names = (section?: object) =>
    Object.keys(section ?? {})
      .filter((name) => name.includes(COMPOSER_VENDOR_SEPARATOR))
      .map((name) => name.toLowerCase());
  return { prod: names(manifest.require), dev: names(manifest['require-dev']) };
};
