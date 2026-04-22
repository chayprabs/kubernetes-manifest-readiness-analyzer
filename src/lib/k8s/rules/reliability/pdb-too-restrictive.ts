import type { K8sRule } from "@/lib/k8s/types";
import {
  createDocumentFinding,
  getDocumentByIndex,
  getDocumentForWorkload,
  getProtectedWorkloadsForPodDisruptionBudget,
  getReplicaCountOrDefault,
  isStrictProfile,
  resolveIntOrPercent,
  toRecord,
} from "@/lib/k8s/rules/reliability/shared";

export const pdbTooRestrictiveRule: K8sRule = {
  id: "pdb-too-restrictive",
  title: "PodDisruptionBudget may block maintenance",
  description:
    "A PodDisruptionBudget that requires every replica to stay available can block voluntary disruptions such as node drains and upgrades.",
  category: "reliability",
  defaultSeverity: "low",
  run(context) {
    return context.podDisruptionBudgets.flatMap((pdb) => {
      const document = getDocumentByIndex(context, pdb.documentIndex);
      const spec = toRecord(document?.raw.spec);
      const minAvailable = spec?.minAvailable;

      if (minAvailable === undefined) {
        return [];
      }

      return getProtectedWorkloadsForPodDisruptionBudget(context, pdb.id)
        .filter(
          (workload) =>
            workload.kind === "Deployment" || workload.kind === "StatefulSet",
        )
        .flatMap((workload) => {
          const workloadDocument = getDocumentForWorkload(context, workload);
          const replicas = getReplicaCountOrDefault(workloadDocument, 1);
          const effectiveMinAvailable =
            resolveIntOrPercent(minAvailable, replicas, "ceil") ?? -1;

          if (replicas < 2 || effectiveMinAvailable !== replicas || !document) {
            return [];
          }

          const saferMinAvailable = Math.max(1, replicas - 1);

          return [
            createDocumentFinding(context, document, {
              ruleId: this.id,
              idSuffix: `${pdb.name}:${workload.name}`,
              title: this.title,
              message: `PodDisruptionBudget "${pdb.name}" requires all ${replicas} replicas of ${workload.kind} "${workload.name}" to stay available.`,
              severity: isStrictProfile(context) ? "medium" : "low",
              category: this.category,
              path: "spec.minAvailable",
              whyItMatters:
                "If voluntary disruptions are allowed to evict zero pods, cluster maintenance can stall even when the workload has enough redundancy to tolerate one pod being moved.",
              recommendation: `Lower minAvailable to ${saferMinAvailable}, or switch to maxUnavailable: 1, so maintenance can proceed without removing all disruption protection.`,
              fix: {
                summary:
                  "Allow one pod of voluntary disruption while keeping the rest protected.",
                yamlPath: "spec.minAvailable",
                snippet: [
                  `minAvailable: ${saferMinAvailable}`,
                  "# Or use:",
                  "# maxUnavailable: 1",
                ].join("\n"),
              },
            }),
          ];
        });
    });
  },
};
