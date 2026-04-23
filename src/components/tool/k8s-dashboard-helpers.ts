import type {
  K8sFindingCategory,
  K8sFindingConfidence,
  K8sObjectRef,
  K8sRiskLevel,
  K8sRelationshipType,
} from "@/lib/k8s/types";

export function formatK8sCategoryLabel(category: K8sFindingCategory) {
  switch (category) {
    case "api-version":
      return "API version";
    case "best-practice":
      return "Best practice";
    default:
      return capitalizeWords(category.replaceAll("-", " "));
  }
}

export function formatK8sConfidenceLabel(confidence: K8sFindingConfidence) {
  return `${capitalizeWords(confidence)} confidence`;
}

export function formatK8sNamespaceLabel(namespace: string | undefined) {
  return namespace ?? "Cluster-scoped";
}

export function formatK8sResourceLabel(
  ref: Pick<K8sObjectRef, "documentIndex" | "kind" | "name" | "namespace">,
) {
  if (ref.kind && ref.name) {
    return ref.namespace
      ? `${ref.kind} ${ref.name} in ${ref.namespace}`
      : `${ref.kind} ${ref.name}`;
  }

  if (ref.kind) {
    return ref.namespace ? `${ref.kind} in ${ref.namespace}` : ref.kind;
  }

  if (ref.documentIndex >= 0) {
    return `Document ${ref.documentIndex + 1}`;
  }

  return "Manifest input";
}

export function formatK8sRelationshipTypeLabel(type: K8sRelationshipType) {
  switch (type) {
    case "service-targets":
      return "Service";
    case "pod-disruption-budget-targets":
      return "PodDisruptionBudget";
    case "horizontal-pod-autoscaler-targets":
      return "HorizontalPodAutoscaler";
    case "network-policy-targets":
      return "NetworkPolicy";
  }
}

export function getRiskBadgeVariant(
  riskLevel: K8sRiskLevel,
): "success" | "warning" | "destructive" | "info" {
  switch (riskLevel) {
    case "low":
      return "success";
    case "moderate":
      return "warning";
    case "high":
    case "critical":
      return "destructive";
  }
}

export function getConfidenceBadgeVariant(
  confidence: K8sFindingConfidence,
): "success" | "warning" | "outline" {
  switch (confidence) {
    case "high":
      return "success";
    case "medium":
      return "warning";
    case "low":
      return "outline";
  }
}

export function getK8sObjectIdentityKey(
  ref: Pick<K8sObjectRef, "kind" | "name" | "namespace">,
) {
  return [
    ref.namespace ?? "__cluster__",
    ref.kind ?? "__unknown__",
    ref.name ?? "__unknown__",
  ].join("|");
}

function capitalizeWords(value: string) {
  return value.replace(/\b\w/g, (segment) => segment.toUpperCase());
}
