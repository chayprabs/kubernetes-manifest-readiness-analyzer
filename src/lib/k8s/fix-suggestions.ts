import { kubernetesApiDeprecations } from "@/lib/k8s/deprecations";
import {
  buildFixPreview,
  buildJsonPatchLikeContent,
  buildNewResourceContent,
  buildStrategicMergePatchLikeContent,
  buildYamlSnippetContent,
} from "@/lib/k8s/patches";
import type {
  K8sFinding,
  K8sFixSuggestion,
  K8sFixSuggestionInput,
  K8sJsonPatchLikeOperation,
  K8sManifestDocument,
  K8sRuleContext,
  K8sServiceResource,
  K8sWorkloadResource,
} from "@/lib/k8s/types";

const preferredLabelKeys = [
  "app.kubernetes.io/name",
  "app.kubernetes.io/instance",
  "app",
  "k8s-app",
  "app.kubernetes.io/component",
  "component",
  "tier",
] as const;

export function normalizeK8sFixSuggestion(
  fix: K8sFixSuggestionInput | undefined,
): K8sFixSuggestion | undefined {
  if (!fix) {
    return undefined;
  }

  if (isTypedFixSuggestion(fix)) {
    return {
      ...fix,
      summary: fix.summary || fix.title,
      snippet: fix.snippet ?? fix.copyableContent,
    };
  }

  if (fix.snippet) {
    return {
      type: "yaml-snippet",
      title: fix.summary,
      riskNote:
        "Review this suggestion before applying it to a live workload. The analyzer is offering guidance, not editing your manifest.",
      safeToAutoApply: false,
      summary: fix.summary,
      yamlPath: fix.yamlPath,
      copyableContent: fix.snippet,
      snippet: fix.snippet,
    };
  }

  return {
    type: "manual-instruction",
    title: fix.summary,
    instructions: fix.summary,
    riskNote:
      "Review this guidance before changing production manifests. The analyzer is surfacing a suggestion, not making the edit for you.",
    safeToAutoApply: false,
    summary: fix.summary,
    yamlPath: fix.yamlPath,
  };
}

export function enrichK8sFixSuggestions(
  context: K8sRuleContext,
  findings: K8sFinding[],
) {
  return findings.map((finding) => ({
    ...finding,
    fix:
      buildFixSuggestionForFinding(context, finding) ??
      normalizeK8sFixSuggestion(finding.fix),
  }));
}

export function buildFixSuggestionForFinding(
  context: K8sRuleContext,
  finding: K8sFinding,
): K8sFixSuggestion | undefined {
  switch (finding.ruleId) {
    case "missing-resource-requests":
    case "missing-resource-limits":
      return buildResourceFixSuggestion(finding);
    case "missing-readiness-probe":
      return buildProbeFixSuggestion(context, finding, "readinessProbe");
    case "missing-liveness-probe":
      return buildProbeFixSuggestion(context, finding, "livenessProbe");
    case "missing-seccomp-profile":
    case "allow-privilege-escalation":
    case "run-as-non-root":
    case "run-as-user-root":
    case "container-may-run-as-root-by-default":
    case "capabilities-not-dropping-all":
    case "dangerous-capabilities-added":
    case "read-only-root-filesystem":
    case "privileged-container":
      return buildSecurityContextFixSuggestion(context, finding);
    case "missing-pod-disruption-budget":
      return buildPodDisruptionBudgetFixSuggestion(context, finding);
    case "ingress-without-tls":
      return buildIngressTlsFixSuggestion(context, finding);
    case "service-selector-matches-nothing":
      return buildServiceSelectorFixSuggestion(context, finding);
    case "single-replica-deployment":
      return buildReplicaFixSuggestion(context, finding);
    case "mutable-image-tag":
      return buildMutableImageFixSuggestion(context, finding);
    case "deprecated-api-version":
    case "podsecuritypolicy-removed":
      return buildDeprecatedApiFixSuggestion(context, finding);
    case "literal-sensitive-env-var":
      return buildLiteralSensitiveEnvVarFixSuggestion(context, finding);
    default:
      return undefined;
  }
}

function buildResourceFixSuggestion(finding: K8sFinding): K8sFixSuggestion {
  const content = buildYamlSnippetContent(
    {
      resources: {
        requests: {
          cpu: "250m",
          memory: "256Mi",
        },
        limits: {
          cpu: "1000m",
          memory: "512Mi",
        },
      },
    },
    {
      commentLines: [
        "Placeholder values only: tune requests and limits from real usage, latency SLOs, and CPU throttling data.",
      ],
    },
  );

  return {
    type: "yaml-snippet",
    title: "Add resource requests and limits",
    riskNote:
      "These values are examples, not safe defaults. Review capacity, burst behavior, and throttling before applying them.",
    safeToAutoApply: false,
    summary: "Add resource requests and limits",
    yamlPath: finding.location?.path,
    copyableContent: content,
    snippet: content,
  };
}

function buildProbeFixSuggestion(
  context: K8sRuleContext,
  finding: K8sFinding,
  probeField: "readinessProbe" | "livenessProbe",
): K8sFixSuggestion {
  const workload = getWorkloadForFinding(context, finding);
  const containerName = getContainerNameFromPath(finding.location?.path);
  const container = getContainerRecord(workload, containerName);
  const portReference = getPreferredPortReference(container);
  const path = probeField === "readinessProbe" ? "/readyz" : "/livez";
  const failureThreshold = probeField === "readinessProbe" ? 3 : 3;
  const httpSnippet = buildYamlSnippetContent(
    {
      [probeField]: {
        httpGet: {
          path,
          port: portReference,
        },
        periodSeconds: 10,
        timeoutSeconds: 1,
        failureThreshold,
      },
    },
    {
      commentLines: [
        "Placeholder only: adjust the endpoint, port, and timing for your application before using this probe.",
      ],
    },
  );
  const tcpSnippet = buildYamlSnippetContent(
    {
      [probeField]: {
        tcpSocket: {
          port: portReference,
        },
        periodSeconds: 10,
        timeoutSeconds: 1,
        failureThreshold,
      },
    },
    {
      commentLines: [
        "TCP alternative: use this only if accepting a socket is a meaningful health signal for the workload.",
      ],
    },
  );
  const content = `${httpSnippet}\n\n${tcpSnippet}`;

  return {
    type: "yaml-snippet",
    title:
      probeField === "readinessProbe"
        ? "Add a readiness probe template"
        : "Add a liveness probe template",
    riskNote:
      "A generic health endpoint is not guaranteed to be correct. Review the real ready or live signal first to avoid false positives.",
    safeToAutoApply: false,
    summary:
      probeField === "readinessProbe"
        ? "Add a readiness probe template"
        : "Add a liveness probe template",
    yamlPath: finding.location?.path,
    copyableContent: content,
    snippet: content,
  };
}

function buildSecurityContextFixSuggestion(
  context: K8sRuleContext,
  finding: K8sFinding,
): K8sFixSuggestion {
  const needsRunAsUserExample = finding.ruleId === "run-as-user-root";
  const podSnippet = buildYamlSnippetContent(
    {
      securityContext: {
        runAsNonRoot: true,
        seccompProfile: {
          type: "RuntimeDefault",
        },
      },
    },
    {
      commentLines: [
        "Pod-level hardening: use this when every container can inherit the same safer defaults.",
      ],
    },
  );
  const containerSnippet = buildYamlSnippetContent(
    {
      securityContext: {
        runAsNonRoot: true,
        ...(needsRunAsUserExample
          ? {
              runAsUser: 10001,
            }
          : {}),
        allowPrivilegeEscalation: false,
        readOnlyRootFilesystem: true,
        capabilities: {
          drop: ["ALL"],
        },
        seccompProfile: {
          type: "RuntimeDefault",
        },
      },
    },
    {
      commentLines: [
        "Container-level hardening: review writable paths, volume mounts, and image UID expectations before applying this block.",
      ],
    },
  );
  const content = `${podSnippet}\n\n${containerSnippet}`;

  return {
    type: "yaml-snippet",
    title: "Add a reviewed securityContext baseline",
    riskNote:
      "These are safer defaults, not universal ones. Some workloads need writable paths, custom UIDs, or narrowly reviewed capability exceptions.",
    safeToAutoApply: false,
    summary: "Add a reviewed securityContext baseline",
    yamlPath: finding.location?.path,
    copyableContent: content,
    snippet: content,
  };
}

function buildPodDisruptionBudgetFixSuggestion(
  context: K8sRuleContext,
  finding: K8sFinding,
): K8sFixSuggestion {
  const workload = getWorkloadForFinding(context, finding);

  if (!workload) {
    return {
      type: "manual-instruction",
      title: "Create a PodDisruptionBudget after verifying workload labels",
      instructions:
        "The analyzer could not resolve the workload metadata needed for a safe PodDisruptionBudget template. Review the workload labels and add a matching PodDisruptionBudget manually.",
      riskNote:
        "A PodDisruptionBudget that targets the wrong labels can block maintenance or fail to protect the intended workload.",
      safeToAutoApply: false,
      summary: "Create a PodDisruptionBudget after verifying workload labels",
      yamlPath: finding.location?.path,
    };
  }

  const selectorLabels = pickPodDisruptionBudgetLabels(workload);

  if (Object.keys(selectorLabels).length === 0) {
    return {
      type: "manual-instruction",
      title: "Create a PodDisruptionBudget after verifying workload labels",
      instructions:
        "This workload does not expose stable selector labels in the parsed manifest. Confirm the labels that uniquely target this workload, then create a PodDisruptionBudget against them.",
      riskNote:
        "A PodDisruptionBudget must match only the intended workload. Guessing the selector can protect the wrong pods or none at all.",
      safeToAutoApply: false,
      summary: "Create a PodDisruptionBudget after verifying workload labels",
      yamlPath: finding.location?.path,
    };
  }

  const replicas = getReplicaCount(
    getDocumentByIndex(context, finding.resourceRef.documentIndex),
  );
  const minAvailable = Math.max(1, (replicas ?? 2) - 1);
  const resource = {
    apiVersion: "policy/v1",
    kind: "PodDisruptionBudget",
    metadata: {
      name: `${workload.name}-pdb`,
      namespace: workload.namespace ?? "default",
    },
    spec: {
      minAvailable,
      selector: {
        matchLabels: selectorLabels,
      },
    },
  };
  const content = buildNewResourceContent(resource, {
    commentLines: [
      "New resource suggestion: confirm the selector and disruption budget match your rollout and maintenance behavior.",
    ],
  });

  return {
    type: "new-resource",
    title: `Create a PodDisruptionBudget for ${workload.name}`,
    riskNote:
      "Review the selector and minAvailable value carefully. Overly strict budgets can block drains and rollouts.",
    safeToAutoApply: false,
    summary: `Create a PodDisruptionBudget for ${workload.name}`,
    yamlPath: finding.location?.path,
    resourceKind: "PodDisruptionBudget",
    copyableContent: content,
    snippet: content,
  };
}

function buildIngressTlsFixSuggestion(
  context: K8sRuleContext,
  finding: K8sFinding,
): K8sFixSuggestion {
  const document = getDocumentByIndex(context, finding.resourceRef.documentIndex);
  const host = getFirstIngressHost(document) ?? "app.example.com";
  const secretName = `${sanitizeForSecretName(host)}-tls`;
  const content = buildYamlSnippetContent(
    {
      tls: [
        {
          hosts: [host],
          secretName,
        },
      ],
    },
    {
      commentLines: [
        "Placeholder only: replace the host and secretName with the certificate mapping your ingress controller actually uses.",
      ],
    },
  );

  return {
    type: "yaml-snippet",
    title: "Add an Ingress TLS block",
    riskNote:
      "This only wires manifest intent. You still need a real certificate secret or certificate automation for the host.",
    safeToAutoApply: false,
    summary: "Add an Ingress TLS block",
    yamlPath: finding.location?.path,
    copyableContent: content,
    snippet: content,
  };
}

function buildServiceSelectorFixSuggestion(
  context: K8sRuleContext,
  finding: K8sFinding,
): K8sFixSuggestion {
  const service = getServiceForFinding(context, finding);

  if (!service) {
    return buildServiceSelectorManualSuggestion(finding, []);
  }

  const workloads = context.workloads.filter(
    (workload) => workload.namespace === service.namespace,
  );
  const candidate = findLikelyServiceTarget(service, workloads);
  const selectorLabels = candidate
    ? pickServiceSelectorLabels(candidate)
    : undefined;

  if (!candidate || !selectorLabels || Object.keys(selectorLabels).length === 0) {
    return buildServiceSelectorManualSuggestion(finding, workloads);
  }

  const operation: K8sJsonPatchLikeOperation = {
    op: "replace",
    path: "/spec/selector",
    value: selectorLabels,
  };
  const content = buildJsonPatchLikeContent([operation], {
    commentLines: [
      `JSON Patch-like example: only apply this if Service "${service.name}" should target ${candidate.kind}/${candidate.name}.`,
    ],
  });

  return {
    type: "json-patch-like",
    title: `Patch the selector to target ${candidate.kind}/${candidate.name}`,
    riskNote:
      "Changing a Service selector can reroute or blackhole traffic immediately. Confirm the intended backend before applying this patch.",
    safeToAutoApply: false,
    summary: `Patch the selector to target ${candidate.kind}/${candidate.name}`,
    yamlPath: finding.location?.path,
    targetRef: {
      apiVersion: service.apiVersion,
      kind: service.kind,
      name: service.name,
      namespace: service.namespace,
    },
    operations: [operation],
    preview: buildFixPreview({
      before: {
        selector: sortStringMap(service.selector?.matchLabels ?? {}),
      },
      after: {
        selector: selectorLabels,
      },
    }),
    copyableContent: content,
    snippet: content,
  };
}

function buildReplicaFixSuggestion(
  context: K8sRuleContext,
  finding: K8sFinding,
): K8sFixSuggestion {
  const recommendedReplicas = context.profile.id === "strict" ? 3 : 2;
  const document = getDocumentByIndex(context, finding.resourceRef.documentIndex);
  const currentReplicas = getReplicaCount(document) ?? 1;
  const targetRef = {
    apiVersion: finding.resourceRef.apiVersion,
    kind: finding.resourceRef.kind,
    name: finding.resourceRef.name,
    namespace: finding.resourceRef.namespace,
  };
  const content = buildStrategicMergePatchLikeContent(
    targetRef,
    {
      spec: {
        replicas: recommendedReplicas,
      },
    },
    {
      commentLines: [
        `Patch-like example: confirm capacity, autoscaling behavior, and disruption budgets before scaling to ${recommendedReplicas} replicas.`,
      ],
    },
  );

  return {
    type: "strategic-merge-patch-like",
    title: `Scale the Deployment to ${recommendedReplicas} replicas`,
    riskNote:
      "Replica changes affect capacity, cost, PodDisruptionBudget behavior, and rollout timing. Review those dependencies before applying the patch.",
    safeToAutoApply: false,
    summary: `Scale the Deployment to ${recommendedReplicas} replicas`,
    yamlPath: finding.location?.path,
    targetRef,
    preview: buildFixPreview({
      before: {
        spec: {
          replicas: currentReplicas,
        },
      },
      after: {
        spec: {
          replicas: recommendedReplicas,
        },
      },
    }),
    copyableContent: content,
    snippet: content,
  };
}

function buildMutableImageFixSuggestion(
  context: K8sRuleContext,
  finding: K8sFinding,
): K8sFixSuggestion {
  const workload = getWorkloadForFinding(context, finding);
  const containerName = getContainerNameFromPath(finding.location?.path);
  const container = getContainerRecord(workload, containerName);
  const image = toNonEmptyString(container?.image) ?? extractImageFromMessage(finding.message);
  const imageBase = image ? stripImageTagOrDigest(image) : "ghcr.io/example/app";
  const content = [
    "# Example only: replace this with the immutable version or digest produced by your release pipeline.",
    `image: ${imageBase}:1.2.3`,
    "# or",
    `image: ${imageBase}@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`,
  ].join("\n");

  return {
    type: "manual-instruction",
    title: "Pin the image to an immutable tag or digest",
    instructions:
      "Replace :latest or an untagged image with a reviewed version tag or image digest from your build pipeline so rollouts stay reproducible.",
    riskNote:
      "Changing the image reference changes the deployed build. Use an artifact that was produced, scanned, and approved by your release process.",
    safeToAutoApply: false,
    summary: "Pin the image to an immutable tag or digest",
    yamlPath: finding.location?.path,
    preview: buildFixPreview({
      before: image ? `image: ${image}` : undefined,
      after: `image: ${imageBase}:1.2.3`,
    }),
    copyableContent: content,
    snippet: content,
  };
}

function buildDeprecatedApiFixSuggestion(
  context: K8sRuleContext,
  finding: K8sFinding,
): K8sFixSuggestion {
  const document = getDocumentByIndex(context, finding.resourceRef.documentIndex);
  const match =
    document?.kind && document.apiVersion
      ? kubernetesApiDeprecations.find(
          (entry) =>
            entry.kind === document.kind && entry.apiVersion === document.apiVersion,
        )
      : undefined;
  const replacementApiVersion = match?.replacementApiVersion;
  const replacementSnippet = replacementApiVersion
    ? `apiVersion: ${replacementApiVersion}`
    : undefined;
  const instructions = replacementApiVersion
    ? `Update apiVersion to ${replacementApiVersion}, then review any schema changes before applying the manifest.${match?.notes ? ` ${match.notes}` : ""}`
    : match?.notes ?? finding.recommendation;

  return {
    type: "manual-instruction",
    title: replacementApiVersion
      ? `Plan a migration to ${replacementApiVersion}`
      : "Review the deprecated API migration path",
    instructions,
    riskNote:
      "A straight apiVersion edit is not always sufficient. Field shapes and controller behavior can change across Kubernetes API versions.",
    safeToAutoApply: false,
    summary: replacementApiVersion
      ? `Plan a migration to ${replacementApiVersion}`
      : "Review the deprecated API migration path",
    yamlPath: finding.location?.path,
    preview: buildFixPreview({
      before: document?.apiVersion ? `apiVersion: ${document.apiVersion}` : undefined,
      after: replacementSnippet,
    }),
    copyableContent: replacementSnippet,
    snippet: replacementSnippet,
  };
}

function buildLiteralSensitiveEnvVarFixSuggestion(
  context: K8sRuleContext,
  finding: K8sFinding,
): K8sFixSuggestion {
  const envName =
    getEnvNameFromPath(finding.location?.path) ??
    extractFirstQuotedValue(finding.message) ??
    "SECRET_NAME";
  const content = buildYamlSnippetContent(
    {
      env: [
        {
          name: envName,
          valueFrom: {
            secretKeyRef: {
              name: "app-secrets",
              key: envName,
            },
          },
        },
      ],
    },
    {
      commentLines: [
        "Template only: create or reference a Secret separately. The original literal value is intentionally not repeated here.",
      ],
    },
  );

  return {
    type: "yaml-snippet",
    title: `Reference a Secret for ${envName}`,
    riskNote:
      "You still need to create the Secret, handle rotation, and roll the workload safely. This suggestion intentionally does not include the original value.",
    safeToAutoApply: false,
    summary: `Reference a Secret for ${envName}`,
    yamlPath: finding.location?.path,
    preview: buildFixPreview({
      before: `env:\n  - name: ${envName}\n    value: <redacted>`,
      after: `env:\n  - name: ${envName}\n    valueFrom:\n      secretKeyRef:\n        name: app-secrets\n        key: ${envName}`,
    }),
    copyableContent: content,
    snippet: content,
  };
}

function buildServiceSelectorManualSuggestion(
  finding: K8sFinding,
  workloads: readonly K8sWorkloadResource[],
): K8sFixSuggestion {
  const workloadHints = workloads.length
    ? `Candidate workloads in the namespace: ${workloads
        .slice(0, 3)
        .map((workload) => `${workload.kind}/${workload.name}`)
        .join(", ")}.`
    : "No candidate workloads were found in the same namespace.";

  return {
    type: "manual-instruction",
    title: "Review the Service selector manually",
    instructions: `The analyzer could not infer a trustworthy selector patch. Compare spec.selector with the pod labels on the intended backend workload and update it manually. ${workloadHints}`,
    riskNote:
      "A wrong selector can send traffic to the wrong pods or to no pods at all, so this change needs human review.",
    safeToAutoApply: false,
    summary: "Review the Service selector manually",
    yamlPath: finding.location?.path,
  };
}

function getDocumentByIndex(
  context: K8sRuleContext,
  documentIndex: number,
) {
  return context.documents.find((document) => document.index === documentIndex);
}

function getWorkloadForFinding(
  context: K8sRuleContext,
  finding: K8sFinding,
) {
  return context.workloads.find(
    (workload) => workload.documentIndex === finding.resourceRef.documentIndex,
  );
}

function getServiceForFinding(
  context: K8sRuleContext,
  finding: K8sFinding,
) {
  return context.services.find(
    (service) => service.documentIndex === finding.resourceRef.documentIndex,
  );
}

function getContainerRecord(
  workload: K8sWorkloadResource | undefined,
  containerName: string | undefined,
) {
  if (!workload || !Array.isArray(workload.podTemplate.spec.containers)) {
    return undefined;
  }

  const containers = workload.podTemplate.spec.containers.flatMap((entry) => {
    const container = toRecord(entry);
    const name = toNonEmptyString(container?.name);

    return container && name
      ? [
          {
            ...(container as Record<string, unknown>),
            name,
          } as Record<string, unknown> & { name: string },
        ]
      : [];
  });

  if (!containerName) {
    return containers[0];
  }

  return containers.find((container) => container.name === containerName);
}

function getPreferredPortReference(container: Record<string, unknown> | undefined) {
  const ports = Array.isArray(container?.ports) ? container.ports : [];

  for (const entry of ports) {
    const port = toRecord(entry);
    const name = toNonEmptyString(port?.name);

    if (name) {
      return name;
    }
  }

  for (const entry of ports) {
    const port = toRecord(entry);
    const number = toNonNegativeInteger(port?.containerPort);

    if (number !== undefined) {
      return number;
    }
  }

  return "http";
}

function getContainerNameFromPath(path: string | undefined) {
  return path?.match(/containers\[name=([^\]]+)\]/)?.[1];
}

function getEnvNameFromPath(path: string | undefined) {
  return path?.match(/env\[name=([^\]]+)\]/)?.[1];
}

function getReplicaCount(document: K8sManifestDocument | undefined) {
  return toNonNegativeInteger(toRecord(document?.raw.spec)?.replicas);
}

function getFirstIngressHost(document: K8sManifestDocument | undefined) {
  const rules = Array.isArray(toRecord(document?.raw.spec)?.rules)
    ? (toRecord(document?.raw.spec)?.rules as unknown[])
    : [];

  for (const entry of rules) {
    const host = toNonEmptyString(toRecord(entry)?.host);

    if (host) {
      return host;
    }
  }

  return undefined;
}

function pickPodDisruptionBudgetLabels(workload: K8sWorkloadResource) {
  const exactSelector = sortStringMap(workload.selector?.matchLabels ?? {});

  if (Object.keys(exactSelector).length > 0) {
    return exactSelector;
  }

  return pickPreferredLabels(workload.podTemplate.labels, 2);
}

function pickServiceSelectorLabels(workload: K8sWorkloadResource) {
  const exactSelector = sortStringMap(workload.selector?.matchLabels ?? {});

  if (Object.keys(exactSelector).length > 0) {
    return exactSelector;
  }

  return pickPreferredLabels(workload.podTemplate.labels, 2);
}

function pickPreferredLabels(
  labels: Record<string, string>,
  limit: number,
) {
  const pickedEntries: Array<[string, string]> = [];

  for (const key of preferredLabelKeys) {
    const value = labels[key];

    if (value) {
      pickedEntries.push([key, value]);
    }

    if (pickedEntries.length >= limit) {
      break;
    }
  }

  if (pickedEntries.length === 0) {
    pickedEntries.push(
      ...Object.entries(labels)
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(0, limit),
    );
  }

  return Object.fromEntries(pickedEntries);
}

function findLikelyServiceTarget(
  service: K8sServiceResource,
  workloads: readonly K8sWorkloadResource[],
) {
  const ranked = workloads
    .map((workload) => ({
      workload,
      score: getServiceTargetScore(service, workload),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.workload.name.localeCompare(right.workload.name);
    });

  return ranked[0]?.workload;
}

function getServiceTargetScore(
  service: K8sServiceResource,
  workload: K8sWorkloadResource,
) {
  let score = 0;

  if (service.name === workload.name) {
    score += 6;
  }

  for (const key of preferredLabelKeys) {
    const serviceLabel = service.labels[key];
    const workloadLabel = workload.podTemplate.labels[key];
    const selectorLabel = workload.selector?.matchLabels[key];

    if (serviceLabel && workloadLabel && serviceLabel === workloadLabel) {
      score += 3;
    }

    if (workloadLabel === service.name || selectorLabel === service.name) {
      score += 2;
    }
  }

  const currentSelector = service.selector?.matchLabels ?? {};

  for (const [key, value] of Object.entries(currentSelector)) {
    if (workload.podTemplate.labels[key] === value) {
      score += 1;
    }
  }

  if (
    service.name.includes(workload.name) ||
    workload.name.includes(service.name)
  ) {
    score += 1;
  }

  return score;
}

function sortStringMap(labels: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(labels).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function stripImageTagOrDigest(image: string) {
  const digestIndex = image.indexOf("@");

  if (digestIndex >= 0) {
    return image.slice(0, digestIndex);
  }

  const lastSlash = image.lastIndexOf("/");
  const lastColon = image.lastIndexOf(":");

  if (lastColon > lastSlash) {
    return image.slice(0, lastColon);
  }

  return image;
}

function sanitizeForSecretName(value: string) {
  const sanitized = value
    .replace(/^\*\./, "wildcard-")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return sanitized.length > 0 ? sanitized : "change-me";
}

function extractImageFromMessage(message: string) {
  return message.match(/uses image "([^"]+)"/)?.[1];
}

function extractFirstQuotedValue(message: string) {
  return message.match(/"([^"]+)"/)?.[1];
}

function isTypedFixSuggestion(
  fix: K8sFixSuggestionInput,
): fix is K8sFixSuggestion {
  return "type" in fix;
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

function toNonNegativeInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return undefined;
  }

  return Number.parseInt(value.trim(), 10);
}
