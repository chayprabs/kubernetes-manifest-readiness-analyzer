import { createHelmFinding } from "@/lib/helm/findings";
import type { HelmRule } from "@/lib/helm/types";

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export const helmPrivilegedContainerRule: HelmRule = {
  id: "privileged-container-values",
  title: "Privileged container enabled in values",
  defaultSeverity: "high",
  run(context) {
    return context.paths.flatMap((entry) => {
      if (!entry.path.endsWith("privileged")) {
        return [];
      }

      if (readBoolean(entry.value) !== true) {
        return [];
      }

      return [
        createHelmFinding({
          rule: helmPrivilegedContainerRule,
          path: entry.path,
          message: "privileged: true is set in Helm values.",
          severity: "critical",
          recommendation: "Disable privileged mode unless the chart absolutely requires it.",
        }),
      ];
    });
  },
};

export const helmAllowPrivilegeEscalationRule: HelmRule = {
  id: "allow-privilege-escalation",
  title: "Privilege escalation allowed in values",
  defaultSeverity: "medium",
  run(context) {
    return context.paths.flatMap((entry) => {
      if (!entry.path.endsWith("allowPrivilegeEscalation")) {
        return [];
      }

      if (readBoolean(entry.value) !== true) {
        return [];
      }

      return [
        createHelmFinding({
          rule: helmAllowPrivilegeEscalationRule,
          path: entry.path,
          message: "allowPrivilegeEscalation is explicitly enabled in values.",
          recommendation: "Set allowPrivilegeEscalation: false for production workloads.",
        }),
      ];
    });
  },
};

export const helmSecurityRules = [
  helmPrivilegedContainerRule,
  helmAllowPrivilegeEscalationRule,
];
