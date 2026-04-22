import type { K8sRule } from "@/lib/k8s/types";
import {
  buildMinimalPdbSnippet,
  createWorkloadFinding,
  getDocumentForWorkload,
  getMatchingPodDisruptionBudgets,
  getReplicaCountOrDefault,
  isStrictProfile,
} from "@/lib/k8s/rules/reliability/shared";

export const missingPodDisruptionBudgetRule: K8sRule = {
  id: "missing-pod-disruption-budget",
  title: "Missing PodDisruptionBudget",
  description:
    "Replica-based workloads usually need a PodDisruptionBudget so voluntary disruptions do not evict too many pods at once.",
  category: "reliability",
  defaultSeverity: "low",
  run(context) {
    return context.workloads
      .filter(
        (workload) =>
          workload.kind === "Deployment" || workload.kind === "StatefulSet",
      )
      .flatMap((workload) => {
        const document = getDocumentForWorkload(context, workload);
        const replicas = getReplicaCountOrDefault(document, 1);

        if (replicas < 2 || getMatchingPodDisruptionBudgets(context, workload).length > 0) {
          return [];
        }

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: workload.name,
            title: this.title,
            message: `${workload.kind} "${workload.name}" has ${replicas} replicas but no matching PodDisruptionBudget.`,
            severity: isStrictProfile(context) ? "medium" : "low",
            category: this.category,
            path: "spec",
            whyItMatters:
              "Without a PodDisruptionBudget, node drains, autoscaler evictions, or maintenance events can remove too many replicas of a healthy workload at once.",
            recommendation:
              "Add a PodDisruptionBudget that matches this workload's labels and still permits at least one pod of temporary unavailability during voluntary disruptions.",
            fix: {
              summary:
                "Create a minimal PodDisruptionBudget matched to the workload labels.",
              yamlPath: "spec",
              snippet: buildMinimalPdbSnippet(
                workload,
                Math.max(1, replicas - 1),
              ),
            },
          }),
        ];
      });
  },
};
