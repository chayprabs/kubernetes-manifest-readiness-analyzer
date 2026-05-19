import { createHelmFinding } from "@/lib/helm/findings";
import { getStringValue, pathMatches } from "@/lib/helm/paths";
import type { HelmRule } from "@/lib/helm/types";

export const helmMutableImageTagRule: HelmRule = {
  id: "mutable-image-tag",
  title: "Mutable image tag in values",
  defaultSeverity: "medium",
  run(context) {
    return context.paths.flatMap((entry) => {
      if (!pathMatches(entry.path, /(^|\.)image$/u) && !pathMatches(entry.path, /tag$/u)) {
        return [];
      }

      const value = getStringValue(entry.value);
      if (!value || value.includes("{{")) {
        return [];
      }

      if (!/:latest$/u.test(value) && !/^latest$/u.test(value)) {
        return [];
      }

      return [
        createHelmFinding({
          rule: helmMutableImageTagRule,
          path: entry.path,
          message: `Image reference "${value}" uses the mutable :latest tag.`,
          recommendation: "Pin charts to immutable tags or digests in values.",
        }),
      ];
    });
  },
};

export const helmMissingImageTagRule: HelmRule = {
  id: "missing-image-tag",
  title: "Image reference without an explicit tag",
  defaultSeverity: "low",
  run(context) {
    return context.paths.flatMap((entry) => {
      if (!pathMatches(entry.path, /(^|\.)image$/u)) {
        return [];
      }

      const value = getStringValue(entry.value);
      if (!value || value.includes("{{") || value.includes(":")) {
        return [];
      }

      return [
        createHelmFinding({
          rule: helmMissingImageTagRule,
          path: entry.path,
          message: `Image "${value}" does not include an explicit tag or digest.`,
          recommendation: "Set a versioned tag so deploys are reproducible.",
        }),
      ];
    });
  },
};

export const helmImageRules = [helmMutableImageTagRule, helmMissingImageTagRule];
