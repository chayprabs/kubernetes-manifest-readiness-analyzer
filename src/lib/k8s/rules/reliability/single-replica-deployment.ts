import type { K8sRule } from "@/lib/k8s/types";
import {
  buildReplicaSnippet,
  createWorkloadFinding,
  getDocumentForWorkload,
  getRecommendedReplicaCount,
  getReplicaCount,
  isStrictProfile,
} from "@/lib/k8s/rules/reliability/shared";

export const singleReplicaDeploymentRule: K8sRule = {
  id: "single-replica-deployment",
  title: "Single replica Deployment",
  description:
    "Production Deployments usually need more than one replica so a restart, drain, or rollout does not remove all serving capacity.",
  category: "reliability",
  defaultSeverity: "low",
  run(context) {
    return context.workloads
      .filter((workload) => workload.kind === "Deployment")
      .flatMap((workload) => {
        const document = getDocumentForWorkload(context, workload);
        const explicitReplicas = getReplicaCount(document);
        const replicas = explicitReplicas ?? 1;

        if (replicas >= 2) {
          return [];
        }

        const recommendedReplicas = getRecommendedReplicaCount(context);

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: workload.name,
            title: this.title,
            message:
              explicitReplicas === undefined
                ? `Deployment "${workload.name}" relies on the default single replica.`
                : `Deployment "${workload.name}" is configured with ${replicas} replica${replicas === 1 ? "" : "s"}.`,
            severity: isStrictProfile(context) ? "medium" : "low",
            category: this.category,
            path: "spec.replicas",
            whyItMatters:
              "A single replica leaves no redundancy for node drains, restarts, or zone-level failures, and it gives rolling updates very little room to stay available.",
            recommendation: `Set this Deployment to at least ${recommendedReplicas} replicas for production-style availability, then confirm the workload and dependencies can support the extra copies.`,
            fix: {
              summary: `Set spec.replicas to ${recommendedReplicas} as a production-ready starting point.`,
              yamlPath: "spec.replicas",
              snippet: buildReplicaSnippet(recommendedReplicas),
            },
          }),
        ];
      });
  },
};
