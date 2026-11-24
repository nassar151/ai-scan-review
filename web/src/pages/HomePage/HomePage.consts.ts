export const HOW_IT_WORKS = [
  {
    title: '1. Scan',
    description: 'Semgrep checks the source for unsafe patterns and leaked secrets. OSV-Scanner checks the dependencies of every supported language.',
  },
  {
    title: '2. Analyze',
    description: 'Duplicates are grouped, and each risk is scored by severity, exposure (production or dev, direct or indirect) and fixability.',
  },
  {
    title: '3. Decide',
    description: 'You get a grade, the few actions that matter most, and a plain-English explanation and fix steps for every finding.',
  },
] as const;
