import { createFinding } from "@/lib/k8s/findings";
import type { K8sRule, K8sRuleContext } from "@/lib/k8s/types";

const serviceSelectorMatchesNothingRule: K8sRule = {
  id: "service-selector-matches-nothing",
  title: "Service selector matches nothing",
  description:
    "Services that do not match any pods or workloads usually indicate a broken route or stale label configuration.",
  category: "networking",
  defaultSeverity: "high",
  run(context) {
    return createRelationshipIssueFindings(
      context,
      this,
      "service-selector-matches-nothing",
    );
  },
};

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

const deploymentSelectorMismatchRule: K8sRule = {
  id: "deployment-selector-mismatch",
  title: "Deployment selector mismatch",
  description:
    "A Deployment selector must match its pod template labels or the controller cannot manage its own pods correctly.",
  category: "reliability",
  defaultSeverity: "high",
  run(context) {
    return createRelationshipIssueFindings(
      context,
      this,
      "deployment-selector-mismatch",
    );
  },
};

export const basicK8sRules: K8sRule[] = [
  serviceSelectorMatchesNothingRule,
  podDisruptionBudgetMatchesNothingRule,
  horizontalPodAutoscalerTargetMissingRule,
  deploymentSelectorMismatchRule,
];

function createRelationshipIssueFindings(
  context: K8sRuleContext,
  rule: K8sRule,
  code:
    | "service-selector-matches-nothing"
    | "pdb-selector-matches-nothing"
    | "hpa-target-not-found"
    | "deployment-selector-mismatch",
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
    | "service-selector-matches-nothing"
    | "pdb-selector-matches-nothing"
    | "hpa-target-not-found"
    | "deployment-selector-mismatch",
) {
  switch (code) {
    case "service-selector-matches-nothing":
      return "Update the Service selector or pod template labels so traffic reaches a real workload.";
    case "pdb-selector-matches-nothing":
      return "Align the PodDisruptionBudget selector with the protected workload labels.";
    case "hpa-target-not-found":
      return "Check scaleTargetRef kind, name, apiVersion, and namespace so the HPA points to an existing workload.";
    case "deployment-selector-mismatch":
      return "Make spec.selector and spec.template.metadata.labels match exactly for the Deployment.";
  }
}
