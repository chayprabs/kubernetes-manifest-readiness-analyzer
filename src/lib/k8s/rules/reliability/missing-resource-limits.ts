import type { K8sRule } from "@/lib/k8s/types";
import {
  buildResourceLimitsSnippet,
  createWorkloadFinding,
  getContainerPath,
  getContainerSpecs,
  hasQuantity,
  isStrictProfile,
  toRecord,
} from "@/lib/k8s/rules/reliability/shared";

export const missingResourceLimitsRule: K8sRule = {
  id: "missing-resource-limits",
  title: "Missing resource limits",
  description:
    "Memory limits protect node stability, while CPU limits should be chosen deliberately because they can introduce throttling.",
  category: "reliability",
  defaultSeverity: "medium",
  run(context) {
    return context.workloads.flatMap((workload) =>
      getContainerSpecs(workload).flatMap((container) => {
        const resources = toRecord(container.record.resources);
        const limits = toRecord(resources?.limits);
        const hasMemoryLimit = hasQuantity(limits?.memory);
        const hasCpuLimit = hasQuantity(limits?.cpu);

        if (hasMemoryLimit && hasCpuLimit) {
          return [];
        }

        const severity = !hasMemoryLimit
          ? isStrictProfile(context)
            ? "high"
            : "medium"
          : isStrictProfile(context)
            ? "medium"
            : "low";

        const message = !hasMemoryLimit && !hasCpuLimit
          ? `Container "${container.name}" in ${workload.kind} "${workload.name}" is missing both memory and CPU limits.`
          : !hasMemoryLimit
            ? `Container "${container.name}" in ${workload.kind} "${workload.name}" is missing a memory limit.`
            : `Container "${container.name}" in ${workload.kind} "${workload.name}" does not set a CPU limit.`;
        const recommendation = !hasMemoryLimit
          ? "Add a memory limit and decide explicitly whether a CPU limit is appropriate for this workload. The example below is only a placeholder and must be tuned."
          : "Decide explicitly whether a CPU limit is appropriate. If you keep it unset to avoid throttling, make that an intentional choice and monitor CPU saturation.";

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${container.name}`,
            title: this.title,
            message,
            severity,
            category: this.category,
            path: getContainerPath(workload, container.name, "resources.limits"),
            whyItMatters:
              "A missing memory limit leaves less containment for runaway memory usage. CPU limits are more nuanced, because a badly chosen limit can throttle request latency under load.",
            recommendation,
            fix: {
              summary:
                "Add a memory limit and, if appropriate, a carefully validated CPU limit.",
              yamlPath: getContainerPath(
                workload,
                container.name,
                "resources.limits",
              ),
              snippet: buildResourceLimitsSnippet(),
            },
          }),
        ];
      }),
    );
  },
};
