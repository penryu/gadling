/**
 * Makes package.json metadata available at runtime.
 *
 * Note: This requires the package.json file to be at a specific location. This
 * should work when running locally and when launched via the container
 * specified in the included Dockerfile.
 */

export interface PackageJson {
  homepage: string;
  license: string;
  name: string;
  repository: string;
  version: string;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const packageJson = require('../package.json') as PackageJson;
