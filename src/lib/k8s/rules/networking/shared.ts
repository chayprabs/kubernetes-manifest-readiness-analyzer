import { createFinding } from "@/lib/k8s/findings";
import type {
  K8sExtractedResource,
  K8sFinding,
  K8sFindingLocation,
  K8sFixSuggestionInput,
  K8sLabelSelector,
  K8sManifestDocument,
  K8sNetworkPolicyResource,
  K8sRuleContext,
  K8sServiceResource,
  K8sWorkloadKind,
  K8sWorkloadResource,
} from "@/lib/k8s/types";

export type ParsedServicePort = {
  name: string | undefined;
  port: number | undefined;
  protocol: string;
  targetPort: string | number | undefined;
  nodePort: number | undefined;
  index: number;
};

export type ParsedIngressBackendRef = {
  serviceName: string | undefined;
  servicePort: string | number | undefined;
  host: string | undefined;
  path: string | undefined;
  pathExpression: string;
};

type CreateNetworkingFindingInput = {
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

const APP_WORKLOAD_KINDS = new Set<K8sWorkloadKind>([
  "Pod",
  "Deployment",
  "StatefulSet",
  "DaemonSet",
  "ReplicaSet",
]);

export function isStrictOrSecurityProfile(context: K8sRuleContext) {
  return context.profile.id === "strict" || context.profile.id === "security";
}

export function isSecurityProfile(context: K8sRuleContext) {
  return context.profile.id === "security";
}

export function isAppWorkload(workload: K8sWorkloadResource) {
  return APP_WORKLOAD_KINDS.has(workload.kind);
}

export function getAppWorkloads(context: K8sRuleContext) {
  return context.workloads.filter(isAppWorkload);
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

export function getMatchedWorkloadsForService(
  context: K8sRuleContext,
  service: K8sServiceResource,
) {
  const matchedIds = new Set(
    context.relationshipGraph.relationships
      .filter(
        (relationship) =>
          relationship.type === "service-targets" &&
          relationship.sourceId === service.id,
      )
      .map((relationship) => relationship.targetId),
  );

  return context.workloads.filter((workload) => matchedIds.has(workload.id));
}

export function getMatchedWorkloadsForNetworkPolicy(
  context: K8sRuleContext,
  policy: K8sNetworkPolicyResource,
) {
  const matchedIds = new Set(
    context.relationshipGraph.relationships
      .filter(
        (relationship) =>
          relationship.type === "network-policy-targets" &&
          relationship.sourceId === policy.id,
      )
      .map((relationship) => relationship.targetId),
  );

  return context.workloads.filter((workload) => matchedIds.has(workload.id));
}

export function getIngressDocuments(context: K8sRuleContext) {
  return context.documents.filter((document) => document.kind === "Ingress");
}

export function getServiceSpec(
  context: K8sRuleContext,
  service: K8sServiceResource,
) {
  const document = getDocumentForResource(context, service);
  return toRecord(document?.raw.spec);
}

export function getServicePorts(
  context: K8sRuleContext,
  service: K8sServiceResource,
): ParsedServicePort[] {
  const spec = getServiceSpec(context, service);
  const ports = Array.isArray(spec?.ports) ? spec.ports : [];

  return ports.flatMap((entry, index) => {
    const port = toRecord(entry);

    if (!port) {
      return [];
    }

    const targetPort = port.targetPort;

    return [
      {
        name: toNonEmptyString(port.name),
        port: toNumber(port.port),
        protocol: toNonEmptyString(port.protocol) ?? "TCP",
        targetPort:
          typeof targetPort === "number" && Number.isFinite(targetPort)
            ? Math.trunc(targetPort)
            : toNonEmptyString(targetPort),
        nodePort: toNumber(port.nodePort),
        index,
      },
    ];
  });
}

export function getServiceType(
  context: K8sRuleContext,
  service: K8sServiceResource,
) {
  return (
    toNonEmptyString(getServiceSpec(context, service)?.type) ?? "ClusterIP"
  );
}

export function getNamespaceNetworkPolicies(
  context: K8sRuleContext,
  namespace: string,
) {
  return context.networkPolicies.filter(
    (policy) => policy.namespace === namespace,
  );
}

export function getNamespaceWorkloads(
  context: K8sRuleContext,
  namespace: string,
) {
  return getAppWorkloads(context).filter(
    (workload) => workload.namespace === namespace,
  );
}

export function createResourceFinding(
  context: K8sRuleContext,
  resource: K8sExtractedResource,
  input: CreateNetworkingFindingInput,
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
    confidence: input.confidence ?? "high",
  });
}

export function createDocumentFinding(
  context: K8sRuleContext,
  document: K8sManifestDocument,
  input: CreateNetworkingFindingInput,
) {
  return createFinding({
    id: `${input.ruleId}:${input.idSuffix}`,
    ruleId: input.ruleId,
    title: input.title,
    message: input.message,
    severity: input.severity,
    category: input.category,
    resourceRef:
      context.resources.find(
        (resource) => resource.documentIndex === document.index,
      )?.ref ?? document.objectRef,
    location: getFindingLocation(context, document.index, input.path),
    whyItMatters: input.whyItMatters,
    recommendation: input.recommendation,
    fix: input.fix,
    confidence: input.confidence ?? "high",
  });
}

export function selectorToString(selector: K8sLabelSelector | undefined) {
  if (!selector) {
    return "{}";
  }

  const parts = Object.entries(selector.matchLabels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`);

  const expressions = selector.matchExpressions.map((expression) => {
    switch (expression.operator) {
      case "Exists":
      case "DoesNotExist":
        return `${expression.key} ${expression.operator}`;
      case "In":
      case "NotIn":
        return `${expression.key} ${expression.operator} (${expression.values.join(", ")})`;
    }
  });

  return [...parts, ...expressions].join(", ") || "{}";
}

export function formatLabelPreview(labels: Record<string, string>) {
  const preferredKeys = [
    "app.kubernetes.io/name",
    "app.kubernetes.io/instance",
    "app",
    "k8s-app",
    "component",
    "tier",
  ];
  const pairs: string[] = [];

  for (const key of preferredKeys) {
    if (labels[key]) {
      pairs.push(`${key}=${labels[key]}`);
    }
  }

  if (pairs.length > 0) {
    return pairs.join(", ");
  }

  const entries = Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, 3)
    .map(([key, value]) => `${key}=${value}`);

  return entries.join(", ") || "no labels";
}

export function formatWorkloadSummary(workload: K8sWorkloadResource) {
  return `${workload.kind}/${workload.name} (${formatLabelPreview(workload.podTemplate.labels)})`;
}

export function hasSelectorMatchExpressions(
  selector: K8sLabelSelector | undefined,
) {
  return Boolean(selector && selector.matchExpressions.length > 0);
}

export function getWorkloadPortNames(workload: K8sWorkloadResource) {
  const names = new Set<string>();

  for (const container of getContainerRecords(workload)) {
    const ports = Array.isArray(container.ports) ? container.ports : [];

    for (const entry of ports) {
      const port = toRecord(entry);
      const name = toNonEmptyString(port?.name);

      if (name) {
        names.add(name);
      }
    }
  }

  return names;
}

export function getWorkloadPortNumbers(workload: K8sWorkloadResource) {
  const numbers = new Set<number>();

  for (const container of getContainerRecords(workload)) {
    const ports = Array.isArray(container.ports) ? container.ports : [];

    for (const entry of ports) {
      const port = toRecord(entry);
      const containerPort = toNumber(port?.containerPort);

      if (containerPort !== undefined) {
        numbers.add(containerPort);
      }
    }
  }

  return numbers;
}

export function workloadHasDeclaredPorts(workload: K8sWorkloadResource) {
  return (
    getWorkloadPortNumbers(workload).size > 0 ||
    getWorkloadPortNames(workload).size > 0
  );
}

export function getServiceIdentity(workload: K8sWorkloadResource) {
  for (const key of [
    "app.kubernetes.io/name",
    "app",
    "k8s-app",
    "app.kubernetes.io/instance",
  ]) {
    const value = workload.podTemplate.labels[key];

    if (value) {
      return `${key}=${value}`;
    }
  }

  return `name=${workload.name}`;
}

export function getCandidateSelectorHint(
  workloads: readonly K8sWorkloadResource[],
) {
  const candidate = workloads[0];

  if (!candidate) {
    return undefined;
  }

  for (const key of [
    "app.kubernetes.io/name",
    "app",
    "k8s-app",
    "app.kubernetes.io/instance",
  ]) {
    const value = candidate.podTemplate.labels[key];

    if (value) {
      return { key, value };
    }
  }

  return undefined;
}

export function buildSelectorMismatchSnippet(
  selector: K8sLabelSelector | undefined,
  candidates: readonly K8sWorkloadResource[],
) {
  const hint = getCandidateSelectorHint(candidates);

  return [
    "# Update the selector so it matches the intended workload labels.",
    "selector:",
    ...(hint ? [`  ${hint.key}: ${hint.value}`] : ["  app: CHANGE_ME"]),
    "",
    `# Current selector: ${selectorToString(selector)}`,
    "# Candidate workloads in the same namespace:",
    ...candidates
      .slice(0, 3)
      .map((workload) => `# - ${formatWorkloadSummary(workload)}`),
  ].join("\n");
}

export function buildIngressTlsSnippet() {
  return [
    "# Template only: choose the real host and certificate secret.",
    "tls:",
    "  - hosts:",
    "      - app.example.com",
    "    secretName: app-example-com-tls",
  ].join("\n");
}

export function buildDefaultDenySnippet(namespace: string) {
  return [
    "apiVersion: networking.k8s.io/v1",
    "kind: NetworkPolicy",
    "metadata:",
    "  name: default-deny",
    `  namespace: ${namespace}`,
    "spec:",
    "  podSelector: {}",
    "  policyTypes:",
    "    - Ingress",
    "    - Egress",
    "  ingress: []",
    "  egress: []",
    "# Careful rollout item: add explicit allow policies before enforcing this in production.",
  ].join("\n");
}

export function hasInternalLoadBalancerIndicator(service: K8sServiceResource) {
  const annotations = service.annotations;

  return Object.entries(annotations).some(([key, value]) => {
    const normalizedKey = key.toLowerCase();
    const normalizedValue = value.toLowerCase();

    if (normalizedKey.includes("internal")) {
      return ["true", "1", "yes", "internal", "private"].includes(
        normalizedValue,
      );
    }

    return (
      normalizedKey.includes("load-balancer-type") &&
      ["internal", "private"].includes(normalizedValue)
    );
  });
}

export function getExternalName(
  context: K8sRuleContext,
  service: K8sServiceResource,
) {
  return toNonEmptyString(getServiceSpec(context, service)?.externalName);
}

export function getIngressBackendRefs(document: K8sManifestDocument) {
  const spec = toRecord(document.raw.spec);
  const references: ParsedIngressBackendRef[] = [];

  const defaultBackend = toRecord(spec?.defaultBackend ?? spec?.backend);
  const defaultRef = getIngressServiceReference(defaultBackend);

  if (defaultRef.serviceName) {
    references.push({
      ...defaultRef,
      host: undefined,
      path: undefined,
      pathExpression: "spec.defaultBackend",
    });
  }

  const rules = Array.isArray(spec?.rules) ? spec.rules : [];

  for (const [ruleIndex, ruleEntry] of rules.entries()) {
    const rule = toRecord(ruleEntry);
    const host = toNonEmptyString(rule?.host);
    const paths = Array.isArray(toRecord(rule?.http)?.paths)
      ? (toRecord(rule?.http)?.paths as unknown[])
      : [];

    for (const [pathIndex, pathEntry] of paths.entries()) {
      const pathRecord = toRecord(pathEntry);
      const backend = toRecord(pathRecord?.backend);
      const ref = getIngressServiceReference(backend);

      if (!ref.serviceName) {
        continue;
      }

      references.push({
        ...ref,
        host,
        path: toNonEmptyString(pathRecord?.path),
        pathExpression: `spec.rules[${ruleIndex}].http.paths[${pathIndex}].backend`,
      });
    }
  }

  return references;
}

export function getIngressHosts(document: K8sManifestDocument) {
  const spec = toRecord(document.raw.spec);
  const rules = Array.isArray(spec?.rules) ? spec.rules : [];

  return rules.map((entry) => toNonEmptyString(toRecord(entry)?.host));
}

export function ingressHasTls(document: K8sManifestDocument) {
  const spec = toRecord(document.raw.spec);
  const tls = Array.isArray(spec?.tls) ? spec.tls : [];

  return tls.some((entry) => toRecord(entry) !== undefined);
}

export function findServiceByName(
  context: K8sRuleContext,
  namespace: string | undefined,
  name: string,
) {
  return context.services.find(
    (service) => service.namespace === namespace && service.name === name,
  );
}

export function isDefaultDenyPolicy(
  context: K8sRuleContext,
  policy: K8sNetworkPolicyResource,
) {
  const document = getDocumentForResource(context, policy);
  const spec = toRecord(document?.raw.spec);
  const podSelector = policy.podSelector;

  if (!podSelector || !isEmptySelector(podSelector)) {
    return { ingress: false, egress: false };
  }

  const policyTypes = arrayOfStrings(spec?.policyTypes).map((value) =>
    value.toLowerCase(),
  );
  const ingressRules = Array.isArray(spec?.ingress) ? spec.ingress : undefined;
  const egressRules = Array.isArray(spec?.egress) ? spec.egress : undefined;

  const deniesIngress =
    policyTypes.includes("ingress") ||
    (ingressRules !== undefined && ingressRules.length === 0);
  const deniesEgress =
    policyTypes.includes("egress") ||
    (egressRules !== undefined && egressRules.length === 0);

  return {
    ingress: deniesIngress && (ingressRules?.length ?? 0) === 0,
    egress: deniesEgress && (egressRules?.length ?? 0) === 0,
  };
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

export function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : undefined;
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

function getContainerRecords(workload: K8sWorkloadResource) {
  const containers = Array.isArray(workload.podTemplate.spec.containers)
    ? workload.podTemplate.spec.containers
    : [];

  return containers.flatMap((entry) => {
    const container = toRecord(entry);
    return container ? [container] : [];
  });
}

function getIngressServiceReference(
  value: Record<string, unknown> | undefined,
) {
  const nestedService = toRecord(value?.service);

  if (nestedService) {
    return {
      serviceName: toNonEmptyString(nestedService.name),
      servicePort:
        toNumber(toRecord(nestedService.port)?.number) ??
        toNonEmptyString(toRecord(nestedService.port)?.name),
    };
  }

  return {
    serviceName: toNonEmptyString(value?.serviceName),
    servicePort:
      toNumber(value?.servicePort) ?? toNonEmptyString(value?.servicePort),
  };
}

function isEmptySelector(selector: K8sLabelSelector) {
  return (
    Object.keys(selector.matchLabels).length === 0 &&
    selector.matchExpressions.length === 0
  );
}
