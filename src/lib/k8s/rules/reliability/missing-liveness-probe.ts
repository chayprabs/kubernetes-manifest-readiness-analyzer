import type { K8sRule } from "@/lib/k8s/types";
import {
  buildProbeTemplateSnippet,
  createWorkloadFinding,
  getContainerPath,
  getContainerSpecs,
  getLongRunningWorkloads,
  toRecord,
} from "@/lib/k8s/rules/reliability/shared";

export const missingLivenessProbeRule: K8sRule = {
  id: "missing-liveness-probe",
  title: "Missing liveness probe",
  description:
    "Liveness probes let Kubernetes recover a container that is still running but no longer making progress.",
  category: "reliability",
  defaultSeverity: "medium",
  run(context) {
    return getLongRunningWorkloads(context).flatMap((workload) =>
      getContainerSpecs(workload).flatMap((container) => {
        if (toRecord(container.record.livenessProbe)) {
          return [];
        }

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${container.name}`,
            title: this.title,
            message: `Container "${container.name}" in ${workload.kind} "${workload.name}" does not define a livenessProbe.`,
            severity: "medium",
            category: this.category,
            path: getContainerPath(workload, container.name, "livenessProbe"),
            whyItMatters:
              "If the process wedges without crashing, Kubernetes has no application-specific signal that the pod should be restarted.",
            recommendation:
              "Add a livenessProbe that reflects real stuck-process behavior. Use the template below as a starting point and adjust the path, port, and timing to match the application.",
            fix: {
              summary: "Add a livenessProbe template and tune it to avoid false positives.",
              yamlPath: getContainerPath(workload, container.name, "livenessProbe"),
              snippet: buildProbeTemplateSnippet("livenessProbe"),
            },
          }),
        ];
      }),
    );
  },
};
