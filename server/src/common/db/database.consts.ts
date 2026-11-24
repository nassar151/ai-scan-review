import type { IndexDescription } from 'mongodb';

export const COLLECTION = {
  SCANS: 'scans',
  FINDINGS: 'findings',
} as const;

/**
 * Scans are listed newest first and filtered by status on restart. Findings are read per scan and result version,
 * in order; the CVE index serves cross-repo questions like "which repos have CVE-X".
 */
export const INDEXES: Record<(typeof COLLECTION)[keyof typeof COLLECTION], IndexDescription[]> = {
  [COLLECTION.SCANS]: [{ key: { createdAt: -1 } }, { key: { status: 1 } }],
  [COLLECTION.FINDINGS]: [{ key: { scanId: 1, version: 1, position: 1 } }, { key: { 'dependency.advisories.cveIds': 1 } }],
};
