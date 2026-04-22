import { createFinding } from "@/lib/k8s/findings";
import type { K8sRule, K8sRuleContext } from "@/lib/k8s/types";

const podDisruptionBudgetMatchesNothingRule: K8sRule = {
  id: "pdb-selector-matches-nothing",
  title: "PodDisruptionBudget selector matches nothing",
  description:
    "A PodDisruptionBudget that matches nothing will not protect the workload during voluntary disruptions.",
  category: "reliability",
  defaultSeverity: "medium",
  run(context) {
    return createRelationshipIssueFindings(
      context,
      this,
      "pdb-selector-matches-nothing",
    );
  },
};

const horizontalPodAutoscalerTargetMissingRule: K8sRule = {
  id: "hpa-target-not-found",
  title: "HorizontalPodAutoscaler target not found",
  description:
    "An HPA without a matching target workload cannot scale anything and usually points to drift in names or namespaces.",
  category: "scalability",
  defaultSeverity: "high",
  run(context) {
    return createRelationshipIssueFindings(
      context,
      this,
      "hpa-target-not-found",
    );
  },
};

export const basicK8sRules: K8sRule[] = [
  podDisruptionBudgetMatchesNothingRule,
  horizontalPodAutoscalerTargetMissingRule,
];

function createRelationshipIssueFindings(
  context: K8sRuleContext,
  rule: K8sRule,
  code:
    | "pdb-selector-matches-nothing"
    | "hpa-target-not-found",
) {
  return context.relationshipGraph.issues
    .filter((issue) => issue.code === code)
    .map((issue) =>
      createFinding({
        id: `${rule.id}:${issue.sourceId}`,
        ruleId: rule.id,
        title: rule.title,
        message: issue.message,
        severity: issue.severity === "error" ? "high" : rule.defaultSeverity,
        category: rule.category,
        resourceRef: issue.sourceRef,
        whyItMatters: rule.description,
        recommendation: getRelationshipRecommendation(code),
        confidence: "high",
      }),
    );
}

function getRelationshipRecommendation(
  code:
    | "pdb-selector-matches-nothing"
    | "hpa-target-not-found",
) {
  switch (code) {
    case "pdb-selector-matches-nothing":
      return "Align the PodDisruptionBudget selector with the protected workload labels.";
    case "hpa-target-not-found":
      return "Check scaleTargetRef kind, name, apiVersion, and namespace so the HPA points to an existing workload.";
  }
}
