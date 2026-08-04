const SEMVER_PATTERN = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function parseVersion(value) {
  const match = String(value).trim().match(SEMVER_PATTERN);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    build: Number(match[4] ?? 0),
    prerelease: match[5] ? match[5].split(".") : [],
  };
}

export function compareVersions(leftValue, rightValue) {
  const left = comparableVersion(parseVersion(leftValue));
  const right = comparableVersion(parseVersion(rightValue));
  if (!left || !right) return null;

  for (const key of ["major", "minor", "patch", "build"]) {
    if (left[key] !== right[key]) return left[key] > right[key] ? 1 : -1;
  }
  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    if (left.prerelease.length === right.prerelease.length) return 0;
    return left.prerelease.length === 0 ? 1 : -1;
  }

  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left.prerelease[index];
    const rightPart = right.prerelease[index];
    if (leftPart === undefined || rightPart === undefined) return leftPart === undefined ? -1 : 1;
    if (leftPart === rightPart) continue;
    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);
    if (leftNumeric && rightNumeric) return Number(leftPart) > Number(rightPart) ? 1 : -1;
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftPart > rightPart ? 1 : -1;
  }
  return 0;
}

function comparableVersion(version) {
  if (!version) return null;
  // 0.4.6-0.4.8 were shipped as fixes before fourth-part tracking existed.
  if (version.major === 0 && version.minor === 4 && version.build === 0 && version.patch >= 6) {
    return { ...version, patch: 5, build: version.patch - 5 };
  }
  return version;
}

export function isNewerVersion(candidate, current) {
  return compareVersions(candidate, current) === 1;
}
