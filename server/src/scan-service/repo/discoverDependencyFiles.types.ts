export interface DependencyFile {
  /** Absolute path of the lockfile or manifest. */
  path: string;
  language: string;
  generated: boolean;
}

export interface DependencyDiscovery {
  files: DependencyFile[];
  warnings: string[];
}
