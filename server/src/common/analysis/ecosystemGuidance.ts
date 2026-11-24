/** How to upgrade a package in one ecosystem; names match OSV ecosystem ids ("npm", "PyPI", "Go", ...). */
export interface EcosystemGuide {
  /** Step that moves a direct dependency to the fixed version. */
  upgradeStep: (name: string, version: string) => string;
  /** Clause (lowercase start) that forces an indirect dependency to the fixed version. */
  pinClause: (name: string, version: string) => string;
  /** Short name of the pinning mechanism, used in grouped next actions. */
  pinMechanism: string;
  /** Step that refreshes the direct dependency pulling the vulnerable package in. */
  updateParentStep: (parent: string) => string;
}

const GO_VERSION_PREFIX = 'v';
const goVersion = (version: string) => (version.startsWith(GO_VERSION_PREFIX) ? version : `${GO_VERSION_PREFIX}${version}`);
const genericParentStep = (parent: string) => `Upgrade ${parent} to its latest release.`;

const DEFAULT_GUIDE: EcosystemGuide = {
  upgradeStep: (name, version) => `Raise ${name} to ${version} or later in your dependency file and reinstall.`,
  pinClause: (name, version) => `pin ${name} to ${version} or later explicitly in your dependency file`,
  pinMechanism: 'an explicit version pin',
  updateParentStep: genericParentStep,
};

const GUIDES: Record<string, EcosystemGuide> = {
  npm: {
    upgradeStep: (name, version) => `Run: npm install ${name}@^${version}`,
    pinClause: (name, version) => `force the fixed version with an npm override: "overrides": { "${name}": "${version}" }`,
    pinMechanism: 'npm "overrides"',
    updateParentStep: (parent) => `Run: npm update ${parent} (or install a newer major of ${parent} if needed)`,
  },
  PyPI: {
    upgradeStep: (name, version) => `Set ${name}>=${version} in requirements.txt (or pyproject.toml), then run: pip install "${name}>=${version}"`,
    pinClause: (name, version) => `add "${name}>=${version}" to your requirements or constraints file`,
    pinMechanism: 'a constraints file',
    updateParentStep: (parent) => `Run: pip install --upgrade ${parent}`,
  },
  Go: {
    upgradeStep: (name, version) => `Run: go get ${name}@${goVersion(version)} && go mod tidy`,
    pinClause: (name, version) => `run go get ${name}@${goVersion(version)} to require the fixed version directly`,
    pinMechanism: 'go get',
    updateParentStep: (parent) => `Run: go get -u ${parent} && go mod tidy`,
  },
  Maven: {
    upgradeStep: (name, version) => `Set the version of ${name} to ${version} in pom.xml (or build.gradle) and rebuild.`,
    pinClause: (name, version) => `pin ${name} to ${version} in <dependencyManagement> (Gradle: a constraints block)`,
    pinMechanism: '<dependencyManagement>',
    updateParentStep: genericParentStep,
  },
  'crates.io': {
    upgradeStep: (name, version) => `Run: cargo update -p ${name} --precise ${version} (raise the version in Cargo.toml first if it is outside the allowed range)`,
    pinClause: (name, version) => `run cargo update -p ${name} --precise ${version}`,
    pinMechanism: 'cargo update --precise',
    updateParentStep: (parent) => `Run: cargo update -p ${parent}`,
  },
  RubyGems: {
    upgradeStep: (name, version) => `Set gem "${name}", ">= ${version}" in the Gemfile, then run: bundle update ${name}`,
    pinClause: (name, version) => `add gem "${name}", ">= ${version}" to the Gemfile and run bundle update ${name}`,
    pinMechanism: 'an explicit Gemfile entry',
    updateParentStep: (parent) => `Run: bundle update ${parent}`,
  },
  Packagist: {
    upgradeStep: (name, version) => `Run: composer require ${name}:^${version}`,
    pinClause: (name, version) => `run composer require ${name}:^${version} to require the fixed version directly`,
    pinMechanism: 'composer require',
    updateParentStep: (parent) => `Run: composer update ${parent} --with-dependencies`,
  },
  NuGet: {
    upgradeStep: (name, version) => `Run: dotnet add package ${name} --version ${version}`,
    pinClause: (name, version) => `add a direct reference with dotnet add package ${name} --version ${version}`,
    pinMechanism: 'a direct package reference',
    updateParentStep: (parent) => `Run: dotnet add package ${parent} (latest version)`,
  },
  Pub: {
    upgradeStep: (name, version) => `Set ${name}: ^${version} in pubspec.yaml, then run: dart pub upgrade ${name}`,
    pinClause: (name, version) => `add ${name}: ^${version} under dependency_overrides in pubspec.yaml`,
    pinMechanism: 'dependency_overrides',
    updateParentStep: (parent) => `Run: dart pub upgrade ${parent}`,
  },
  Hex: {
    upgradeStep: (name, version) => `Set {:${name}, "~> ${version}"} in mix.exs, then run: mix deps.update ${name}`,
    pinClause: (name, version) => `add {:${name}, "~> ${version}", override: true} to mix.exs`,
    pinMechanism: 'a mix.exs override',
    updateParentStep: (parent) => `Run: mix deps.update ${parent}`,
  },
};

export const guideFor = (ecosystem: string): EcosystemGuide =>
  Object.hasOwn(GUIDES, ecosystem) ? GUIDES[ecosystem]! : DEFAULT_GUIDE;
