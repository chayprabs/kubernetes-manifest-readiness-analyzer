import { createFinding } from "@/lib/k8s/findings";
import type {
  K8sFinding,
  K8sFindingLocation,
  K8sFixSuggestionInput,
  K8sManifestDocument,
  K8sRuleContext,
  K8sWorkloadKind,
  K8sWorkloadResource,
} from "@/lib/k8s/types";

export type ReliabilityContainerSpec = {
  name: string;
  image: string | undefined;
  record: Record<string, unknown>;
};

const LONG_RUNNING_WORKLOAD_KINDS = new Set<K8sWorkloadKind>([
  "Pod",
  "Deployment",
  "StatefulSet",
  "DaemonSet",
  "ReplicaSet",
]);

const SLOW_START_PATTERNS = [
  /\bjava\b/i,
  /\bjvm\b/i,
  /\bspring\b/i,
  /\btomcat\b/i,
  /\bjetty\b/i,
  /\bkeycloak\b/i,
  /\bjenkins\b/i,
  /\bsonarqube\b/i,
  /\belasticsearch\b/i,
  /\bkibana\b/i,
];

type CreateResourceFindingInput = {
  ruleId: string;
  idSuffix: string;
  title: string;
  message: string;
  severity: K8sFinding["severity"];
  category: K8sFinding["category"];
  whyItMatters: string;
  recommendation: string;
  fix?: K8sFixSuggestionInput;
  confidence?: K8sFinding["confidence"];
  path?: string;
};

export function isStrictProfile(context: K8sRuleContext) {
  return context.profile.id === "strict";
}

export function getRecommendedReplicaCount(context: K8sRuleContext) {
  return isStrictProfile(context) ? 3 : 2;
}

export function isLongRunningWorkload(workload: K8sWorkloadResource) {
  return LONG_RUNNING_WORKLOAD_KINDS.has(workload.kind);
}

export function getLongRunningWorkloads(context: K8sRuleContext) {
  return context.workloads.filter(isLongRunningWorkload);
}

export function getContainerSpecs(
  workload: K8sWorkloadResource,
): ReliabilityContainerSpec[] {
  const containers = Array.isArray(workload.podTemplate.spec.containers)
    ? workload.podTemplate.spec.containers
    : [];

  return containers.flatMap((entry) => {
    const record = toRecord(entry);
    const name = toNonEmptyString(record?.name);

    if (!record || !name) {
      return [];
    }

    return [
      {
        name,
        image: toNonEmptyString(record.image),
        record,
      },
    ];
  });
}

export function getDocumentByIndex(
  context: K8sRuleContext,
  documentIndex: number,
) {
  return context.documents.find((document) => document.index === documentIndex);
}

export function getDocumentForWorkload(
  context: K8sRuleContext,
  workload: K8sWorkloadResource,
) {
  return getDocumentByIndex(context, workload.documentIndex);
}

export function getSpecRecord(document: K8sManifestDocument | undefined) {
  return toRecord(document?.raw.spec);
}

export function getReplicaCount(document: K8sManifestDocument | undefined) {
  return toNonNegativeInteger(getSpecRecord(document)?.replicas);
}

export function getReplicaCountOrDefault(
  document: K8sManifestDocument | undefined,
  fallback = 1,
) {
  return getReplicaCount(document) ?? fallback;
}

export function getPodSpecPath(kind: K8sWorkloadKind) {
  switch (kind) {
    case "Pod":
      return "spec";
    case "CronJob":
      return "spec.jobTemplate.spec.template.spec";
    default:
      return "spec.template.spec";
  }
}

export function getContainerPath(
  workload: K8sWorkloadResource,
  containerName: string,
  field?: string,
) {
  const base = `${getPodSpecPath(workload.kind)}.containers[name=${containerName}]`;
  return field ? `${base}.${field}` : base;
}

export function getDeclaredPortNames(container: Record<string, unknown>) {
  if (!Array.isArray(container.ports)) {
    return new Set<string>();
  }

  return new Set(
    container.ports.flatMap((entry) => {
      const port = toRecord(entry);
      const name = toNonEmptyString(port?.name);
      return name ? [name] : [];
    }),
  );
}

export function getProbePortReference(probe: Record<string, unknown>) {
  const httpGet = toRecord(probe.httpGet);
  const tcpSocket = toRecord(probe.tcpSocket);
  const grpc = toRecord(probe.grpc);
  const value = httpGet?.port ?? tcpSocket?.port ?? grpc?.port;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return toNonEmptyString(value);
}

export function seemsSlowStartingContainer(
  container: ReliabilityContainerSpec,
) {
  const haystack = `${container.name} ${container.image ?? ""}`;
  return SLOW_START_PATTERNS.some((pattern) => pattern.test(haystack));
}

export function resolveIntOrPercent(
  value: unknown,
  base: number,
  rounding: "floor" | "ceil" = "floor",
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  const normalized = toNonEmptyString(value);

  if (!normalized) {
    return undefined;
  }

  if (/^\d+%$/.test(normalized)) {
    const percent = Number.parseInt(normalized.slice(0, -1), 10);
    const computed = (base * percent) / 100;
    return rounding === "ceil" ? Math.ceil(computed) : Math.floor(computed);
  }

  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }

  return undefined;
}

export function getMatchingPodDisruptionBudgets(
  context: K8sRuleContext,
  workload: K8sWorkloadResource,
) {
  const matchingIds = new Set(
    context.relationshipGraph.relationships
      .filter(
        (relationship) =>
          relationship.type === "pod-disruption-budget-targets" &&
          relationship.targetId === workload.id,
      )
      .map((relationship) => relationship.sourceId),
  );

  return context.podDisruptionBudgets.filter((pdb) => matchingIds.has(pdb.id));
}

export function getProtectedWorkloadsForPodDisruptionBudget(
  context: K8sRuleContext,
  sourceId: string,
) {
  const matchingIds = new Set(
    context.relationshipGraph.relationships
      .filter(
        (relationship) =>
          relationship.type === "pod-disruption-budget-targets" &&
          relationship.sourceId === sourceId,
      )
      .map((relationship) => relationship.targetId),
  );

  return context.workloads.filter((workload) => matchingIds.has(workload.id));
}

export function buildProbeTemplateSnippet(
  probeField: "readinessProbe" | "livenessProbe" | "startupProbe",
) {
  const path =
    probeField === "readinessProbe"
      ? "/readyz"
      : probeField === "livenessProbe"
        ? "/livez"
        : "/startupz";
  const failureThreshold = probeField === "startupProbe" ? 30 : 3;

  return [
    "# Template only: adjust the path, port, and timing for your application.",
    `${probeField}:`,
    "  httpGet:",
    `    path: ${path}`,
    "    port: http",
    probeField === "startupProbe"
      ? "  periodSeconds: 10"
      : "  periodSeconds: 10",
    "  timeoutSeconds: 1",
    `  failureThreshold: ${failureThreshold}`,
    "",
    "# Or for a TCP service:",
    `${probeField}:`,
    "  tcpSocket:",
    "    port: 8080",
    "  periodSeconds: 10",
    "  timeoutSeconds: 1",
    `  failureThreshold: ${failureThreshold}`,
  ].join("\n");
}

export function buildResourceRequestsSnippet() {
  return [
    "# Example placeholders only: size these from real usage and SLOs.",
    "resources:",
    "  requests:",
    '    cpu: "250m"',
    '    memory: "256Mi"',
  ].join("\n");
}

export function buildResourceLimitsSnippet() {
  return [
    "# Example placeholders only: validate real memory usage and CPU throttling.",
    "resources:",
    "  limits:",
    '    memory: "512Mi"',
    '    cpu: "1000m" # optional; confirm this does not throttle the workload',
  ].join("\n");
}

export function buildReplicaSnippet(replicas: number) {
  return `replicas: ${replicas}`;
}

export function buildMinimalPdbSnippet(
  workload: K8sWorkloadResource,
  minAvailable: number,
) {
  const selectorLabels = pickPodDisruptionBudgetSelectorLabels(workload);
  const selectorBlock =
    Object.keys(selectorLabels).length > 0
      ? Object.entries(selectorLabels)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(
            ([key, value]) => `      ${JSON.stringify(key)}: ${JSON.stringify(value)}`,
          )
          .join("\n")
      : '      "app": "CHANGE_ME"';

  return [
    "apiVersion: policy/v1",
    "kind: PodDisruptionBudget",
    "metadata:",
    `  name: ${JSON.stringify(`${workload.name}-pdb`)}`,
    `  namespace: ${JSON.stringify(workload.namespace ?? "default")}`,
    "spec:",
    `  minAvailable: ${minAvailable}`,
    "  selector:",
    "    matchLabels:",
    selectorBlock,
  ].join("\n");
}

export function formatHumanList(values: readonly string[]) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0]!;
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
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

export function toNonNegativeInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return undefined;
  }

  return Number.parseInt(value.trim(), 10);
}

export function hasQuantity(value: unknown) {
  return (
    (typeof value === "string" && value.trim().length > 0) ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

export function createWorkloadFinding(
  context: K8sRuleContext,
  workload: K8sWorkloadResource,
  input: CreateResourceFindingInput,
) {
  return createFinding({
    id: `${input.ruleId}:${input.idSuffix}`,
    ruleId: input.ruleId,
    title: input.title,
    message: input.message,
    severity: input.severity,
    category: input.category,
    resourceRef: workload.ref,
    location: getResourceLocation(context, workload.documentIndex, input.path),
    whyItMatters: input.whyItMatters,
    recommendation: input.recommendation,
    fix: input.fix,
    confidence: input.confidence ?? "high",
  });
}

export function createDocumentFinding(
  context: K8sRuleContext,
  document: K8sManifestDocument,
  input: CreateResourceFindingInput,
) {
  return createFinding({
    id: `${input.ruleId}:${input.idSuffix}`,
    ruleId: input.ruleId,
    title: input.title,
    message: input.message,
    severity: input.severity,
    category: input.category,
    resourceRef: document.objectRef,
    location: getResourceLocation(context, document.index, input.path),
    whyItMatters: input.whyItMatters,
    recommendation: input.recommendation,
    fix: input.fix,
    confidence: input.confidence ?? "high",
  });
}

function getResourceLocation(
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

function pickPodDisruptionBudgetSelectorLabels(workload: K8sWorkloadResource) {
  const selectorLabels = workload.selector?.matchLabels ?? {};

  for (const key of [
    "app.kubernetes.io/name",
    "app.kubernetes.io/instance",
    "app",
    "k8s-app",
  ]) {
    const value = selectorLabels[key] ?? workload.podTemplate.labels[key];

    if (value) {
      return { [key]: value };
    }
  }

  if (Object.keys(selectorLabels).length > 0) {
    return selectorLabels;
  }

  return workload.podTemplate.labels;
}
