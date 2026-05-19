import { createHelmFinding } from "@/lib/helm/findings";
import type { HelmRule } from "@/lib/helm/types";

function isEmptyMapping(value: unknown) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length === 0
  );
}

export const helmEmptyResourcesRule: HelmRule = {
  id: "empty-resources-block",
  title: "Empty resources block in values",
  defaultSeverity: "medium",
  run(context) {
    return context.paths.flatMap((entry) => {
      if (!entry.path.endsWith("resources")) {
        return [];
      }

      if (!isEmptyMapping(entry.value)) {
        return [];
      }

      return [
        createHelmFinding({
          rule: helmEmptyResourcesRule,
          path: entry.path,
          message: "resources is present but empty, so charts may deploy without requests or limits.",
          recommendation:
            "Set cpu/memory requests and limits in values so templates can render predictable resources.",
        }),
      ];
    });
  },
};

export const helmMissingResourcesRule: HelmRule = {
  id: "missing-resources-for-workload",
  title: "Workload values without resources",
  defaultSeverity: "medium",
  run(context) {
    const workloadRoots = new Set<string>();

    for (const entry of context.paths) {
      if (entry.path.endsWith(".image") || entry.path.endsWith(".replicaCount")) {
        const root = entry.path.replace(/\.(image|replicaCount)$/u, "");
        workloadRoots.add(root);
      }
    }

    return [...workloadRoots].flatMap((root) => {
      const hasResources = context.paths.some(
        (entry) => entry.path === `${root}.resources` || entry.path.startsWith(`${root}.resources.`),
      );

      if (hasResources) {
        return [];
      }

      return [
        createHelmFinding({
          rule: helmMissingResourcesRule,
          path: root,
          message: `Values for "${root}" define workload settings without a resources block.`,
          recommendation: "Add resources.requests and resources.limits under this workload in values.",
        }),
      ];
    });
  },
};

export const helmResourceRules = [helmEmptyResourcesRule, helmMissingResourcesRule];
