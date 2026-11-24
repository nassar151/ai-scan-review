import path from 'node:path';
import { findFiles } from '../../common/repo/walkRepo';
import type { DependencyDiscovery } from './discoverDependencyFiles.types';
import { discoverNodeProjects } from './discoverProjects';
import { NPM_LANGUAGE, OTHER_DEPENDENCY_FILES } from './discoverProjects.consts';

const isOtherDependencyFile = (name: string) => Object.hasOwn(OTHER_DEPENDENCY_FILES, name);

/** Every dependency file osv-scanner should read: npm lockfiles (generated when missing) plus other ecosystems. */
export const discoverDependencyFiles = async (
  root: string,
  onProgress: (message: string) => void,
): Promise<DependencyDiscovery> => {
  const node = await discoverNodeProjects(root, onProgress);
  const npmFiles = node.projects.flatMap((project) =>
    project.lockfilePath ? [{ path: project.lockfilePath, language: NPM_LANGUAGE, generated: project.lockfileGenerated }] : [],
  );
  const otherFiles = (await findFiles(root, isOtherDependencyFile)).map((file) => ({
    path: file,
    language: OTHER_DEPENDENCY_FILES[path.basename(file)]!,
    generated: false,
  }));
  return { files: [...npmFiles, ...otherFiles], warnings: node.warnings };
};
