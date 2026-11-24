const SIBILANT_ENDING = /(s|x|z|ch|sh)$/;
const CONSONANT_Y_ENDING = /[^aeiou]y$/;

const pluralize = (word: string) => {
  if (CONSONANT_Y_ENDING.test(word)) return `${word.slice(0, -1)}ies`;
  return SIBILANT_ENDING.test(word) ? `${word}es` : `${word}s`;
};

export const plural = (count: number, word: string) => `${count} ${count === 1 ? word : pluralize(word)}`;
