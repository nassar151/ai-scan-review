const IRREGULAR_PLURALS: Record<string, string> = {
  dependency: 'dependencies',
  advisory: 'advisories',
  vulnerability: 'vulnerabilities',
  'known vulnerability': 'known vulnerabilities',
};
const SIBILANT_ENDING = /(s|x|z|ch|sh)$/;

const pluralize = (word: string) =>
  IRREGULAR_PLURALS[word] ?? (SIBILANT_ENDING.test(word) ? `${word}es` : `${word}s`);

export const plural = (count: number, word: string) => `${count} ${count === 1 ? word : pluralize(word)}`;

export const toMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
