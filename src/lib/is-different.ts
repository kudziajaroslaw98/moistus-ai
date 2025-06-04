export const isDifferent = (a: unknown, b: unknown): boolean => {
  if (a === b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return true;
    return a.some((val, i) => isDifferent(val, b[i]));
  }

  if (a && b && typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    if (JSON.stringify(aObj) === "{}" && JSON.stringify(bObj) === "{}")
      return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return true;
    return aKeys.some((key) => isDifferent(aObj[key], bObj[key]));
  }

  return true;
};

export const getDifferentFields = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): Record<string, unknown> => {
  const differences: Record<string, unknown> = {};

  for (const key in a) {
    if (
      Object.prototype.hasOwnProperty.call(a, key) &&
      (!Object.prototype.hasOwnProperty.call(b, key) ||
        isDifferent(a[key], b[key]))
    ) {
      differences[key] = b[key] !== undefined ? b[key] : null;
    }
  }

  for (const key in b) {
    if (
      Object.prototype.hasOwnProperty.call(b, key) &&
      !Object.prototype.hasOwnProperty.call(a, key)
    ) {
      differences[key] = b[key];
    }
  }

  return differences;
};
