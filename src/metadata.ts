export interface PackageJson {
  homepage: string;
  license: string;
  name: string;
  repository: string;
  version: string;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const packageJson = require('../package.json') as PackageJson;
