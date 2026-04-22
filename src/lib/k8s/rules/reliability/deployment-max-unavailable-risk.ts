import type { K8sRule } from "@/lib/k8s/types";
import {
  createWorkloadFinding,
  getDocumentForWorkload,
  getRecommendedReplicaCount,
  getReplicaCountOrDefault,
  resolveIntOrPercent,
  toNonEmptyString,
  toRecord,
} from "@/lib/k8s/rules/reliability/shared";

export const deploymentMaxUnavailableRiskRule: K8sRule = {
  id: "deployment-max-unavailable-risk",
  title: "Deployment rollout availability risk",
  description:
    "Small Deployments and aggressive maxUnavailable settings can make rolling updates drop too much healthy capacity at once.",
  category: "reliability",
  defaultSeverity: "medium",
  run(context) {
    return context.workloads
      .filter((workload) => workload.kind === "Deployment")
      .flatMap((workload) => {
        const document = getDocumentForWorkload(context, workload);
        const spec = toRecord(document?.raw.spec);
        const strategy = toRecord(spec?.strategy);
        const strategyType = toNonEmptyString(strategy?.type) ?? "RollingUpdate";

        if (strategyType !== "RollingUpdate") {
          return [];
        }

        const replicas = getReplicaCountOrDefault(document, 1);
        const rollingUpdate = toRecord(strategy?.rollingUpdate);
        const configuredMaxUnavailable =
          rollingUpdate?.maxUnavailable ?? "25%";
        const effectiveMaxUnavailable =
          resolveIntOrPercent(configuredMaxUnavailable, replicas, "floor") ?? 0;

        if (replicas < 2) {
          const recommendedReplicas = getRecommendedReplicaCount(context);

          return [
            createWorkloadFinding(context, workload, {
              ruleId: this.id,
              idSuffix: workload.name,
              title: this.title,
              message: `Deployment "${workload.name}" rolls only ${replicas} replica${replicas === 1 ? "" : "s"}, so a rollout has no spare serving capacity if the replacement pod starts slowly or fails readiness.`,
              severity: "medium",
              category: this.category,
              path: "spec.strategy.rollingUpdate.maxUnavailable",
              whyItMatters:
                "Even with a RollingUpdate strategy, a single-replica Deployment can still interrupt traffic during updates because there is no healthy buffer when the new pod is not ready yet.",
              recommendation: `Increase replicas to at least ${recommendedReplicas} and keep maxUnavailable at 0 for small Deployments that need to stay online during rollouts.`,
              fix: {
                summary:
                  "Keep zero planned unavailability during rollout and add replica headroom.",
                yamlPath: "spec.strategy.rollingUpdate.maxUnavailable",
                snippet: [
                  "strategy:",
                  "  type: RollingUpdate",
                  "  rollingUpdate:",
                  "    maxUnavailable: 0",
                  "    maxSurge: 1",
                ].join("\n"),
              },
            }),
          ];
        }

        if (!isRiskyMaxUnavailable(replicas, effectiveMaxUnavailable)) {
          return [];
        }

        const severity =
          effectiveMaxUnavailable >= replicas ? "high" : "medium";

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: workload.name,
            title: this.title,
            message: `Deployment "${workload.name}" sets rollingUpdate.maxUnavailable to ${formatConfiguredValue(configuredMaxUnavailable)}, which allows ${effectiveMaxUnavailable} unavailable pod${effectiveMaxUnavailable === 1 ? "" : "s"} during rollout with only ${replicas} replica${replicas === 1 ? "" : "s"}.`,
            severity,
            category: this.category,
            path: "spec.strategy.rollingUpdate.maxUnavailable",
            whyItMatters:
              "If too many pods are allowed to go unavailable at once, a rolling update can cut capacity sharply or briefly leave no ready pods for small Deployments.",
            recommendation:
              "Reduce maxUnavailable for this Deployment. For small replica counts, maxUnavailable: 0 is the safest default when uninterrupted traffic matters.",
            fix: {
              summary:
                "Reduce rollout unavailability so the Deployment keeps enough ready pods.",
              yamlPath: "spec.strategy.rollingUpdate.maxUnavailable",
              snippet: [
                "strategy:",
                "  type: RollingUpdate",
                "  rollingUpdate:",
                "    maxUnavailable: 0",
                "    maxSurge: 1",
              ].join("\n"),
            },
          }),
        ];
      });
  },
};

function isRiskyMaxUnavailable(replicas: number, maxUnavailable: number) {
  if (maxUnavailable <= 0) {
    return false;
  }

  if (replicas === 2) {
    return maxUnavailable >= 1;
  }

  if (replicas === 3) {
    return maxUnavailable >= 2;
  }

  return maxUnavailable >= Math.ceil(replicas / 2);
}

function formatConfiguredValue(value: unknown) {
  return typeof value === "number" ? value.toString() : (value ?? "0").toString();
}
