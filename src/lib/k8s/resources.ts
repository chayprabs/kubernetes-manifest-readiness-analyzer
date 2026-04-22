import {
  normalizeLabelSelector,
  selectorFromLabelMap,
} from "@/lib/k8s/selectors";
import { extractWorkloadResource } from "@/lib/k8s/workloads";
import type {
  K8sConfigResource,
  K8sExtractedResource,
  K8sExtractedResourceBase,
  K8sHorizontalPodAutoscalerResource,
  K8sIngressResource,
  K8sManifestDocument,
  K8sNamespacedKind,
  K8sNamespaceResource,
  K8sNetworkPolicyResource,
  K8sPodDisruptionBudgetResource,
  K8sRbacResource,
  K8sResourceKind,
  K8sSecretResource,
  K8sServiceAccountResource,
  K8sServiceResource,
} from "@/lib/k8s/types";

export const DEFAULT_NAMESPACE = "default";

const NAMESPACED_KINDS = new Set<K8sNamespacedKind>([
  "ConfigMap",
  "CronJob",
  "DaemonSet",
  "Deployment",
  "HorizontalPodAutoscaler",
  "Ingress",
  "Job",
  "NetworkPolicy",
  "Pod",
  "PodDisruptionBudget",
  "ReplicaSet",
  "Role",
  "RoleBinding",
  "Secret",
  "Service",
  "ServiceAccount",
  "StatefulSet",
]);

const RBAC_KINDS = new Set<K8sResourceKind>([
  "Role",
  "ClusterRole",
  "RoleBinding",
  "ClusterRoleBinding",
]);

export function extractK8sResources(
  documents: K8sManifestDocument[],
): K8sExtractedResource[] {
  return documents.flatMap((document) => {
    const resource = extractK8sResource(document);
    return resource ? [resource] : [];
  });
}

export function extractK8sResource(
  document: K8sManifestDocument,
): K8sExtractedResource | undefined {
  if (!document.kind || !document.metadata.name) {
    return undefined;
  }

  const namespace = getResourceNamespace(document);
  const resourceId = buildResourceId(
    document.kind,
    document.metadata.name,
    namespace,
  );
  const workload = namespace
    ? extractWorkloadResource(document, resourceId, namespace)
    : undefined;

  if (workload) {
    return workload;
  }

  switch (document.kind) {
    case "Service":
      return {
        ...createBaseResource(document, resourceId, namespace, "service"),
        kind: "Service",
        selector: selectorFromLabelMap(
          getNestedValue(document.raw, ["spec", "selector"]),
        ),
      } satisfies K8sServiceResource;
    case "Ingress":
      return {
        ...createBaseResource(document, resourceId, namespace, "ingress"),
        kind: "Ingress",
      } satisfies K8sIngressResource;
    case "PodDisruptionBudget":
      return {
        ...createBaseResource(
          document,
          resourceId,
          namespace,
          "pod-disruption-budget",
        ),
        kind: "PodDisruptionBudget",
        selector: normalizeLabelSelector(
          getNestedValue(document.raw, ["spec", "selector"]),
        ),
      } satisfies K8sPodDisruptionBudgetResource;
    case "HorizontalPodAutoscaler":
      return {
        ...createBaseResource(
          document,
          resourceId,
          namespace,
          "horizontal-pod-autoscaler",
        ),
        kind: "HorizontalPodAutoscaler",
        scaleTargetRef: extractScaleTargetRef(document),
      } satisfies K8sHorizontalPodAutoscalerResource;
    case "Namespace":
      return {
        ...createBaseResource(document, resourceId, undefined, "namespace"),
        kind: "Namespace",
        scope: "Cluster",
      } satisfies K8sNamespaceResource;
    case "ConfigMap":
      return {
        ...createBaseResource(document, resourceId, namespace, "config"),
        kind: "ConfigMap",
      } satisfies K8sConfigResource;
    case "Secret":
      return {
        ...createBaseResource(document, resourceId, namespace, "secret"),
        kind: "Secret",
        secretType: toNonEmptyString(document.raw.type),
      } satisfies K8sSecretResource;
    case "ServiceAccount":
      return {
        ...createBaseResource(
          document,
          resourceId,
          namespace,
          "service-account",
        ),
        kind: "ServiceAccount",
      } satisfies K8sServiceAccountResource;
    case "NetworkPolicy":
      return {
        ...createBaseResource(
          document,
          resourceId,
          namespace,
          "network-policy",
        ),
        kind: "NetworkPolicy",
        podSelector: normalizeLabelSelector(
          getNestedValue(document.raw, ["spec", "podSelector"]),
        ),
      } satisfies K8sNetworkPolicyResource;
    default:
      if (isRbacKind(document.kind)) {
        return {
          ...createBaseResource(document, resourceId, namespace, "rbac"),
          kind: document.kind,
        } satisfies K8sRbacResource;
      }

      return undefined;
  }
}

export function getResourceNamespace(document: K8sManifestDocument) {
  if (!document.kind) {
    return undefined;
  }

  if (isNamespacedKind(document.kind)) {
    return document.metadata.namespace ?? DEFAULT_NAMESPACE;
  }

  return undefined;
}

export function isNamespacedKind(
  kind: K8sResourceKind | undefined,
): kind is K8sNamespacedKind {
  return kind !== undefined && NAMESPACED_KINDS.has(kind as K8sNamespacedKind);
}

export function buildResourceId(
  kind: string,
  name: string,
  namespace: string | undefined,
) {
  return namespace ? `${kind}:${namespace}/${name}` : `${kind}:${name}`;
}

function createBaseResource<
  Category extends K8sExtractedResourceBase["category"],
>(
  document: K8sManifestDocument,
  id: string,
  namespace: string | undefined,
  category: Category,
): Omit<K8sExtractedResourceBase, "category"> & { category: Category } {
  if (!document.kind || !document.metadata.name) {
    throw new Error("Resource extraction requires kind and metadata.name.");
  }

  return {
    id,
    kind: document.kind,
    apiVersion: document.apiVersion,
    name: document.metadata.name,
    namespace,
    scope: namespace ? "Namespaced" : "Cluster",
    category,
    labels: document.metadata.labels,
    annotations: document.metadata.annotations,
    documentIndex: document.index,
    ref: {
      ...document.objectRef,
      kind: document.kind,
      name: document.metadata.name,
      namespace,
    },
  };
}

function extractScaleTargetRef(document: K8sManifestDocument) {
  const scaleTargetRef = toRecord(
    getNestedValue(document.raw, ["spec", "scaleTargetRef"]),
  );
  const namespace = getResourceNamespace(document);

  if (!scaleTargetRef) {
    return undefined;
  }

  return {
    apiVersion: toNonEmptyString(scaleTargetRef.apiVersion),
    kind: toNonEmptyString(scaleTargetRef.kind) as K8sResourceKind | undefined,
    name: toNonEmptyString(scaleTargetRef.name),
    namespace,
  };
}

function getNestedValue(value: Record<string, unknown>, path: string[]) {
  let current: unknown = value;

  for (const segment of path) {
    current = toRecord(current)?.[segment];
  }

  return current;
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function toNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function isRbacKind(kind: K8sResourceKind): kind is K8sRbacResource["kind"] {
  return RBAC_KINDS.has(kind);
}
