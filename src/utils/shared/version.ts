/**
 * Classivo App Version
 * Bump this with every release. Format: "MAJOR.MINOR.PATCH"
 * Admin sets the minimum required version in the Force Update panel.
 * Users with APP_VERSION < minVersion will be shown the force-update gate.
 */
export const APP_VERSION = "1.0.0";

/**
 * Compare two semver strings. Returns:
 *  -1 if a < b
 *   0 if a === b
 *   1 if a > b
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string) =>
    (v || "0.0.0").split(".").map((n) => parseInt(n, 10) || 0);
  const [aMaj, aMin, aPatch] = parse(a);
  const [bMaj, bMin, bPatch] = parse(b);

  if (aMaj !== bMaj) return aMaj < bMaj ? -1 : 1;
  if (aMin !== bMin) return aMin < bMin ? -1 : 1;
  if (aPatch !== bPatch) return aPatch < bPatch ? -1 : 1;
  return 0;
}

/** Returns true if the current app is older than the required minimum version */
export function isOutdated(minVersion: string): boolean {
  return compareSemver(APP_VERSION, minVersion) < 0;
}
