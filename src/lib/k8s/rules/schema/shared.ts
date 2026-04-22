import { createFinding } from "@/lib/k8s/findings";
import { getResourceNamespace, isNamespacedKind } from "@/lib/k8s/resources";
import type {
  K8sExtractedResource,
  K8sFinding,
  K8sFindingLocation,
  K8sFixSuggestionInput,
  K8sManifestDocument,
  K8sRuleContext,
  K8sWorkloadResource,
} from "@/lib/k8s/types";

type CreatePackFindingInput = {
  ruleId: string;
  idSuffix: string;
  title: string;
  message: string;
  severity: K8sFinding["severity"];
  category: K8sFinding["category"];
  whyItMatters: string;
  recommendation: string;
  fix?: K8sFixSuggestionInput;
  docsUrl?: string | undefined;
  confidence?: K8sFinding["confidence"];
  path?: string;
};

export const commonBuiltInKinds = new Set([
  "ConfigMap",
  "CronJob",
  "CustomResourceDefinition",
  "DaemonSet",
  "Deployment",
  "HorizontalPodAutoscaler",
  "Ingress",
  "IngressClass",
  "Job",
  "Namespace",
  "NetworkPolicy",
  "PersistentVolumeClaim",
  "Pod",
  "PodDisruptionBudget",
  "PodSecurityPolicy",
  "ReplicaSet",
  "Role",
  "RoleBinding",
  "Secret",
  "Service",
  "ServiceAccount",
  "StatefulSet",
  "ClusterRole",
  "ClusterRoleBinding",
]);

export function isStrictLikeProfile(context: K8sRuleContext) {
  return context.profile.id === "strict" || context.profile.id === "security";
}

export function getDocumentByIndex(
  context: K8sRuleContext,
  documentIndex: number,
) {
  return context.documents.find((document) => document.index === documentIndex);
}

export function getDocumentForResource(
  context: K8sRuleContext,
  resource: K8sExtractedResource,
) {
  return getDocumentByIndex(context, resource.documentIndex);
}

export function createResourceFinding(
  context: K8sRuleContext,
  resource: K8sExtractedResource,
  input: CreatePackFindingInput,
) {
  return createFinding({
    id: `${input.ruleId}:${input.idSuffix}`,
    ruleId: input.ruleId,
    title: input.title,
    message: input.message,
    severity: input.severity,
    category: input.category,
    resourceRef: resource.ref,
    location: getFindingLocation(context, resource.documentIndex, input.path),
    whyItMatters: input.whyItMatters,
    recommendation: input.recommendation,
    fix: input.fix,
    docsUrl: input.docsUrl,
    confidence: input.confidence ?? "high",
  });
}

export function createDocumentFinding(
  context: K8sRuleContext,
  document: K8sManifestDocument,
  input: CreatePackFindingInput,
) {
  return createFinding({
    id: `${input.ruleId}:${input.idSuffix}`,
    ruleId: input.ruleId,
    title: input.title,
    message: input.message,
    severity: input.severity,
    category: input.category,
    resourceRef:
      context.resources.find((resource) => resource.documentIndex === document.index)
        ?.ref ?? document.objectRef,
    location: getFindingLocation(context, document.index, input.path),
    whyItMatters: input.whyItMatters,
    recommendation: input.recommendation,
    fix: input.fix,
    docsUrl: input.docsUrl,
    confidence: input.confidence ?? "high",
  });
}

export function getAppMetadataResources(context: K8sRuleContext) {
  return context.resources.filter(
    (resource) =>
      resource.category === "workload" ||
      resource.category === "service" ||
      resource.category === "ingress",
  );
}

export function getResolvedObjectNamespace(document: K8sManifestDocument) {
  return getResourceNamespace(document) ?? document.metadata.namespace;
}

export function resolveIdentityKey(document: K8sManifestDocument) {
  if (!document.apiVersion || !document.kind || !document.metadata.name) {
    return undefined;
  }

  const namespace = isNamespacedKind(document.kind)
    ? document.metadata.namespace ?? "default"
    : document.metadata.namespace ?? "";

  return [
    document.apiVersion,
    document.kind,
    namespace,
    document.metadata.name,
  ].join("|");
}

export function getWorkloadSpecLocationPath(workload: K8sWorkloadResource) {
  return workload.kind === "Pod" ? "spec" : "spec.template";
}

export function buildRecommendedLabelsSnippet(resourceName: string) {
  return [
    "metadata:",
    "  labels:",
    `    app.kubernetes.io/name: ${resourceName}`,
    `    app.kubernetes.io/instance: ${resourceName}`,
    "    app.kubernetes.io/component: api # adjust to web, worker, db, etc.",
    "    app.kubernetes.io/part-of: platform-name",
    '    app.kubernetes.io/managed-by: gitops-or-helm',
  ].join("\n");
}

export function buildOwnershipSnippet() {
  return [
    "metadata:",
    "  labels:",
    "    team: platform-team",
    "  annotations:",
    "    owner: platform-team",
  ].join("\n");
}

export function buildNamespaceSnippet(namespace = "your-namespace") {
  return [
    "metadata:",
    `  namespace: ${namespace}`,
  ].join("\n");
}

export function toRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function toNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function sizeInBytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function getFindingLocation(
  context: K8sRuleContext,
  documentIndex: number,
  path: string | undefined,
): K8sFindingLocation | undefined {
  const document = getDocumentByIndex(context, documentIndex);

  if (!document) {
    return undefined;
  }

  return {
    documentIndex,
    path,
    source: document.fieldLocations.spec ?? document.location,
  };
}
