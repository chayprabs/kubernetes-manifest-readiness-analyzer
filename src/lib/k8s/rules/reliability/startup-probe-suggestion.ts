import type { K8sRule } from "@/lib/k8s/types";
import {
  buildProbeTemplateSnippet,
  createWorkloadFinding,
  getContainerPath,
  getContainerSpecs,
  getLongRunningWorkloads,
  seemsSlowStartingContainer,
  toNonNegativeInteger,
  toRecord,
} from "@/lib/k8s/rules/reliability/shared";

export const startupProbeSuggestionRule: K8sRule = {
  id: "startup-probe-suggestion",
  title: "Consider a startup probe",
  description:
    "Startup probes protect slow boot sequences without forcing the liveness probe to stay weak forever.",
  category: "reliability",
  defaultSeverity: "low",
  run(context) {
    return getLongRunningWorkloads(context).flatMap((workload) =>
      getContainerSpecs(workload).flatMap((container) => {
        const livenessProbe = toRecord(container.record.livenessProbe);

        if (!livenessProbe || toRecord(container.record.startupProbe)) {
          return [];
        }

        const initialDelaySeconds =
          toNonNegativeInteger(livenessProbe.initialDelaySeconds) ?? 0;
        const slowStartHint = seemsSlowStartingContainer(container);

        if (initialDelaySeconds < 60 && !slowStartHint) {
          return [];
        }

        const severity = initialDelaySeconds >= 60 ? "low" : "info";
        const reason =
          initialDelaySeconds >= 60
            ? `livenessProbe waits ${initialDelaySeconds} seconds before it starts`
            : "the image or container name suggests a slower startup path";

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${container.name}`,
            title: this.title,
            message: `Container "${container.name}" in ${workload.kind} "${workload.name}" has a livenessProbe but no startupProbe, and ${reason}.`,
            severity,
            category: this.category,
            path: getContainerPath(workload, container.name, "startupProbe"),
            whyItMatters:
              "Using a startupProbe lets you keep steady-state liveness checks responsive without restarting the pod during a normal slow boot.",
            recommendation:
              "Consider adding a startupProbe tuned to the application bootstrap time, then keep the livenessProbe focused on steady-state recovery.",
            fix: {
              summary: "Add a startupProbe template for slow starts and adjust it to the real startup behavior.",
              yamlPath: getContainerPath(workload, container.name, "startupProbe"),
              snippet: buildProbeTemplateSnippet("startupProbe"),
            },
            confidence: initialDelaySeconds >= 60 ? "high" : "medium",
          }),
        ];
      }),
    );
  },
};
