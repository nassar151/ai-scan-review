import fs from 'node:fs/promises';
import path from 'node:path';

/** The scan's clone folder, shared by the scan service and the AI service. */
export const repoDirFor = (reposDir: string, scanId: string) => path.join(reposDir, scanId);

export const removeDir = (dir: string) => fs.rm(dir, { recursive: true, force: true });
