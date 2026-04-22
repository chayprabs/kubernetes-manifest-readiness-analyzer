import { createFinding } from "@/lib/k8s/findings";
import type {
  K8sFinding,
  K8sFindingLocation,
  K8sFixSuggestionInput,
  K8sManifestDocument,
  K8sObjectRef,
  K8sRuleContext,
  K8sWorkloadKind,
  K8sWorkloadResource,
} from "@/lib/k8s/types";

export type SecurityContainerSpec = {
  name: string;
  image: string | undefined;
  record: Record<string, unknown>;
};

type CreateSecurityFindingInput = {
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

const PRODUCTION_STYLE_WORKLOAD_KINDS = new Set<K8sWorkloadKind>([
  "Pod",
  "Deployment",
  "StatefulSet",
  "DaemonSet",
  "ReplicaSet",
]);

export const dangerousCapabilities = new Set([
  "SYS_ADMIN",
  "NET_ADMIN",
  "SYS_PTRACE",
  "SYS_MODULE",
  "DAC_OVERRIDE",
  "DAC_READ_SEARCH",
  "NET_RAW",
]);

export function isSecurityProfile(context: K8sRuleContext) {
  return context.profile.id === "security";
}

export function isProductionStyleWorkload(workload: K8sWorkloadResource) {
  return PRODUCTION_STYLE_WORKLOAD_KINDS.has(workload.kind);
}

export function getProductionStyleWorkloads(context: K8sRuleContext) {
  return context.workloads.filter(isProductionStyleWorkload);
}

export function getContainerSpecs(
  workload: K8sWorkloadResource,
): SecurityContainerSpec[] {
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

export function getPodSecurityContext(workload: K8sWorkloadResource) {
  return toRecord(workload.podTemplate.spec.securityContext);
}

export function getContainerSecurityContext(container: SecurityContainerSpec) {
  return toRecord(container.record.securityContext);
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

export function getPodPath(
  workload: K8sWorkloadResource,
  field?: string,
) {
  const base = getPodSpecPath(workload.kind);
  return field ? `${base}.${field}` : base;
}

export function getContainerPath(
  workload: K8sWorkloadResource,
  containerName: string,
  field?: string,
) {
  const base = `${getPodSpecPath(workload.kind)}.containers[name=${containerName}]`;
  return field ? `${base}.${field}` : base;
}

export function getEnvPath(
  workload: K8sWorkloadResource,
  containerName: string,
  envName: string,
) {
  return `${getContainerPath(workload, containerName)}.env[name=${envName}]`;
}

export function createWorkloadFinding(
  context: K8sRuleContext,
  workload: K8sWorkloadResource,
  input: CreateSecurityFindingInput,
) {
  return createFinding({
    id: `${input.ruleId}:${input.idSuffix}`,
    ruleId: input.ruleId,
    title: input.title,
    message: input.message,
    severity: input.severity,
    category: input.category,
    resourceRef: workload.ref,
    location: getFindingLocation(context, workload.documentIndex, input.path),
    whyItMatters: input.whyItMatters,
    recommendation: input.recommendation,
    fix: input.fix,
    confidence: input.confidence ?? "high",
  });
}

export function createDocumentFinding(
  context: K8sRuleContext,
  document: K8sManifestDocument,
  input: CreateSecurityFindingInput,
) {
  return createFinding({
    id: `${input.ruleId}:${input.idSuffix}`,
    ruleId: input.ruleId,
    title: input.title,
    message: input.message,
    severity: input.severity,
    category: input.category,
    resourceRef: getDocumentResourceRef(context, document),
    location: getFindingLocation(context, document.index, input.path),
    whyItMatters: input.whyItMatters,
    recommendation: input.recommendation,
    fix: input.fix,
    confidence: input.confidence ?? "high",
  });
}

export function buildPodSecurityContextSnippet() {
  return [
    "# Safe starting point only: some apps need writable volumes or other adjustments.",
    "securityContext:",
    "  runAsNonRoot: true",
    "  seccompProfile:",
    "    type: RuntimeDefault",
  ].join("\n");
}

export function buildContainerSecurityContextSnippet(
  extraLines: string[] = [],
) {
  return [
    "# Safe starting point only: some apps need writable volumes or privileged operations.",
    "securityContext:",
    "  runAsNonRoot: true",
    "  allowPrivilegeEscalation: false",
    "  readOnlyRootFilesystem: true",
    "  capabilities:",
    "    drop:",
    "      - ALL",
    "  seccompProfile:",
    "    type: RuntimeDefault",
    ...extraLines,
  ].join("\n");
}

export function buildEnvSecretRefSnippet(envName: string) {
  return [
    "env:",
    `  - name: ${envName}`,
    "    valueFrom:",
    "      secretKeyRef:",
    "        name: app-secrets",
    `        key: ${envName}`,
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

export function arrayOfStrings(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const normalized = toNonEmptyString(entry);
    return normalized ? [normalized] : [];
  });
}

export function getServiceAccountName(workload: K8sWorkloadResource) {
  return (
    toNonEmptyString(workload.podTemplate.spec.serviceAccountName) ??
    toNonEmptyString(workload.podTemplate.spec.serviceAccount) ??
    "default"
  );
}

export function getEffectiveBooleanField(
  workload: K8sWorkloadResource,
  container: SecurityContainerSpec,
  field: string,
) {
  const containerSecurityContext = getContainerSecurityContext(container);
  const podSecurityContext = getPodSecurityContext(workload);
  const value = containerSecurityContext?.[field] ?? podSecurityContext?.[field];

  return typeof value === "boolean" ? value : undefined;
}

export function getEffectiveNumericField(
  workload: K8sWorkloadResource,
  container: SecurityContainerSpec,
  field: string,
) {
  const containerSecurityContext = getContainerSecurityContext(container);
  const podSecurityContext = getPodSecurityContext(workload);
  const value = containerSecurityContext?.[field] ?? podSecurityContext?.[field];

  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : undefined;
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

function getDocumentResourceRef(
  context: K8sRuleContext,
  document: K8sManifestDocument,
): K8sObjectRef {
  return (
    context.resources.find((resource) => resource.documentIndex === document.index)
      ?.ref ?? document.objectRef
  );
}
