import type { K8sRule } from "@/lib/k8s/types";
import {
  buildProbeTemplateSnippet,
  createWorkloadFinding,
  getContainerPath,
  getContainerSpecs,
  getLongRunningWorkloads,
  toRecord,
} from "@/lib/k8s/rules/reliability/shared";

export const missingReadinessProbeRule: K8sRule = {
  id: "missing-readiness-probe",
  title: "Missing readiness probe",
  description:
    "Services should wait to send traffic until each long-running container is actually ready to serve requests.",
  category: "reliability",
  defaultSeverity: "high",
  run(context) {
    return getLongRunningWorkloads(context).flatMap((workload) =>
      getContainerSpecs(workload).flatMap((container) => {
        if (toRecord(container.record.readinessProbe)) {
          return [];
        }

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${container.name}`,
            title: this.title,
            message: `Container "${container.name}" in ${workload.kind} "${workload.name}" does not define a readinessProbe.`,
            severity: "high",
            category: this.category,
            path: getContainerPath(workload, container.name, "readinessProbe"),
            whyItMatters:
              "Without readiness checks, Kubernetes can route Service traffic to a pod before the application has finished booting or warming dependencies.",
            recommendation:
              "Add a readinessProbe for this container. Use the template below as a starting point and adjust the path, port, and timing to match the application.",
            fix: {
              summary: "Add a readinessProbe template and tailor it to the real ready signal.",
              yamlPath: getContainerPath(workload, container.name, "readinessProbe"),
              snippet: buildProbeTemplateSnippet("readinessProbe"),
            },
          }),
        ];
      }),
    );
  },
};
