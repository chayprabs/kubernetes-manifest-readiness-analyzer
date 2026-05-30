import type { HelmValuePath } from "@/lib/helm/types";

export function collectHelmValuePaths(
  value: unknown,
  prefix = "",
): HelmValuePath[] {
  if (value === null || value === undefined) {
    return prefix ? [{ path: prefix, value }] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectHelmValuePaths(entry, `${prefix}[${index}]`),
    );
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, entry]) => {
        const nextPath = prefix ? `${prefix}.${key}` : key;
        if (Array.isArray(entry)) {
          return entry.flatMap((item, index) =>
            collectHelmValuePaths(item, `${nextPath}[${index}]`),
          );
        }
        if (entry !== null && typeof entry === "object") {
          return collectHelmValuePaths(entry, nextPath);
        }
        return [{ path: nextPath, value: entry }];
      },
    );
  }

  return [{ path: prefix, value }];
}

export function getStringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export function pathMatches(path: string, pattern: RegExp) {
  return pattern.test(path);
}
