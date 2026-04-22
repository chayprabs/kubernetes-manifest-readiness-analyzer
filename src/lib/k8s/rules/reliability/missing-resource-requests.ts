import type { K8sRule } from "@/lib/k8s/types";
import {
  buildResourceRequestsSnippet,
  createWorkloadFinding,
  formatHumanList,
  getContainerPath,
  getContainerSpecs,
  hasQuantity,
  isStrictProfile,
  toRecord,
} from "@/lib/k8s/rules/reliability/shared";

export const missingResourceRequestsRule: K8sRule = {
  id: "missing-resource-requests",
  title: "Missing resource requests",
  description:
    "Requests are the scheduler's input for placement and the baseline for capacity planning.",
  category: "reliability",
  defaultSeverity: "medium",
  run(context) {
    return context.workloads.flatMap((workload) =>
      getContainerSpecs(workload).flatMap((container) => {
        const resources = toRecord(container.record.resources);
        const requests = toRecord(resources?.requests);
        const missing = ["cpu", "memory"].filter(
          (field) => !hasQuantity(requests?.[field]),
        );

        if (missing.length === 0) {
          return [];
        }

        const severity =
          missing.length === 2
            ? isStrictProfile(context)
              ? "high"
              : "medium"
            : "low";

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${container.name}`,
            title: this.title,
            message: `Container "${container.name}" in ${workload.kind} "${workload.name}" is missing ${formatHumanList(missing)} request${missing.length > 1 ? "s" : ""}.`,
            severity,
            category: this.category,
            path: getContainerPath(workload, container.name, "resources.requests"),
            whyItMatters:
              "Without explicit requests, the scheduler cannot reserve predictable CPU and memory for the container, which makes placement and cluster capacity planning less reliable.",
            recommendation:
              "Set CPU and memory requests for this container using measured usage as a starting point. The example below is a placeholder, not a universal production value.",
            fix: {
              summary:
                "Add CPU and memory requests with placeholder values, then tune them from real workload data.",
              yamlPath: getContainerPath(
                workload,
                container.name,
                "resources.requests",
              ),
              snippet: buildResourceRequestsSnippet(),
            },
          }),
        ];
      }),
    );
  },
};
