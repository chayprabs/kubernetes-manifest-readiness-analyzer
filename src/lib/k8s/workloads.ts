import { normalizeLabelSelector } from "@/lib/k8s/selectors";
import type {
  K8sContainerReference,
  K8sLabelSelector,
  K8sManifestDocument,
  K8sPodTemplate,
  K8sWorkloadKind,
  K8sWorkloadResource,
} from "@/lib/k8s/types";

const WORKLOAD_KINDS = new Set<K8sWorkloadKind>([
  "Pod",
  "Deployment",
  "StatefulSet",
  "DaemonSet",
  "ReplicaSet",
  "Job",
  "CronJob",
]);

export function isWorkloadKind(
  kind: string | undefined,
): kind is K8sWorkloadKind {
  return kind !== undefined && WORKLOAD_KINDS.has(kind as K8sWorkloadKind);
}

export function getPodTemplate(
  resource: K8sManifestDocument,
): K8sPodTemplate | undefined {
  const kind = resource.kind;
  const raw = resource.raw;

  if (!isWorkloadKind(kind)) {
    return undefined;
  }

  if (kind === "Pod") {
    return createPodTemplate(raw.metadata, raw.spec);
  }

  if (kind === "CronJob") {
    const template = getNestedRecord(raw, [
      "spec",
      "jobTemplate",
      "spec",
      "template",
    ]);

    return createPodTemplate(template?.metadata, template?.spec);
  }

  const template = getNestedRecord(raw, ["spec", "template"]);

  return createPodTemplate(template?.metadata, template?.spec);
}

export function getWorkloadSelector(
  resource: K8sManifestDocument,
): K8sLabelSelector | undefined {
  if (!isWorkloadKind(resource.kind) || resource.kind === "Pod") {
    return undefined;
  }

  if (resource.kind === "CronJob") {
    return undefined;
  }

  return normalizeLabelSelector(
    getNestedRecord(resource.raw, ["spec", "selector"]),
  );
}

export function extractWorkloadResource(
  resource: K8sManifestDocument,
  id: string,
  namespace: string,
): K8sWorkloadResource | undefined {
  if (
    !resource.kind ||
    !resource.metadata.name ||
    !isWorkloadKind(resource.kind)
  ) {
    return undefined;
  }

  const podTemplate = getPodTemplate(resource);

  if (!podTemplate) {
    return undefined;
  }

  return {
    id,
    kind: resource.kind,
    apiVersion: resource.apiVersion,
    name: resource.metadata.name,
    namespace,
    scope: "Namespaced",
    category: "workload",
    labels: resource.metadata.labels,
    annotations: resource.metadata.annotations,
    documentIndex: resource.index,
    ref: {
      ...resource.objectRef,
      namespace,
      kind: resource.kind,
      name: resource.metadata.name,
    },
    podTemplate,
    selector: getWorkloadSelector(resource),
  };
}

function createPodTemplate(
  metadataValue: unknown,
  specValue: unknown,
): K8sPodTemplate | undefined {
  const spec = toRecord(specValue);

  if (!spec) {
    return undefined;
  }

  const metadata = toRecord(metadataValue);

  return {
    labels: toStringRecord(metadata?.labels),
    annotations: toStringRecord(metadata?.annotations),
    spec,
    containers: extractContainers(spec.containers),
    initContainers: extractContainers(spec.initContainers),
    ephemeralContainers: extractContainers(spec.ephemeralContainers),
  };
}

function extractContainers(value: unknown): K8sContainerReference[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const container = toRecord(entry);
    const name = toNonEmptyString(container?.name);

    if (!name) {
      return [];
    }

    return [
      {
        name,
        image: toNonEmptyString(container?.image),
      },
    ];
  });
}

function getNestedRecord(
  value: Record<string, unknown>,
  path: string[],
): Record<string, unknown> | undefined {
  let current: unknown = value;

  for (const segment of path) {
    current = toRecord(current)?.[segment];
  }

  return toRecord(current);
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function toStringRecord(value: unknown) {
  const record = toRecord(value);

  if (!record) {
    return {};
  }

  const normalized: Record<string, string> = {};

  for (const [key, entry] of Object.entries(record)) {
    const stringValue = toNonEmptyString(entry);

    if (stringValue) {
      normalized[key] = stringValue;
    }
  }

  return normalized;
}

function toNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}
