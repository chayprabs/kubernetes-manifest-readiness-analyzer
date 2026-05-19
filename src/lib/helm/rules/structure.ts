import { createHelmFinding } from "@/lib/helm/findings";
import type { HelmRule } from "@/lib/helm/types";

export const helmEmptyRootRule: HelmRule = {
  id: "empty-values-root",
  title: "Empty Helm values file",
  defaultSeverity: "info",
  run(context) {
    if (Object.keys(context.root).length > 0) {
      return [];
    }

    return [
      createHelmFinding({
        rule: helmEmptyRootRule,
        path: "(root)",
        message: "The values file is empty.",
        severity: "info",
        recommendation: "Add chart overrides or load a sample values file.",
      }),
    ];
  },
};

export const helmStructureRules = [helmEmptyRootRule];
