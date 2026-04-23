import { findingCategories, getFindingSeverityRank } from "@/lib/k8s/findings";
import type {
  K8sFinding,
  K8sFindingCategory,
  K8sFixSuggestion,
  K8sFixSuggestionType,
  K8sObjectRef,
} from "@/lib/k8s/types";

export const k8sWhyNotAutoApplyNote =
  "Kubernetes patches are context-sensitive. Selectors, probes, rollout settings, TLS secret names, and NetworkPolicy rules often need manifest-specific review before they are safe to apply.";

export type K8sFixBucketId = "safe-copy" | "manual-review";

export type K8sFixResourceGroup = {
  id: string;
  resourceRef: K8sObjectRef;
  findings: K8sFinding[];
  count: number;
};

export type K8sFixCategoryGroup = {
  category: K8sFindingCategory;
  resources: K8sFixResourceGroup[];
  count: number;
};

export type K8sFixBucket = {
  id: K8sFixBucketId;
  findings: K8sFinding[];
  categories: K8sFixCategoryGroup[];
  count: number;
};

const categoryRank = Object.fromEntries(
  findingCategories.map((category, index) => [category, index]),
) as Record<K8sFindingCategory, number>;

export function buildFixBuckets(
  findings: readonly K8sFinding[],
): [K8sFixBucket, K8sFixBucket] {
  const fixableFindings = findings.filter((finding) => finding.fix);
  const safeCopyFindings = fixableFindings.filter(hasCopyableFixSnippet);
  const manualReviewFindings = fixableFindings.filter(
    (finding) => !hasCopyableFixSnippet(finding),
  );

  return [
    buildFixBucket("safe-copy", safeCopyFindings),
    buildFixBucket("manual-review", manualReviewFindings),
  ];
}

export function hasCopyableFixSnippet(finding: K8sFinding) {
  return Boolean(finding.fix?.copyableContent?.trim());
}

export function formatK8sFixTypeLabel(type: K8sFixSuggestionType) {
  switch (type) {
    case "yaml-snippet":
      return "YAML snippet";
    case "strategic-merge-patch-like":
      return "Strategic merge patch";
    case "json-patch-like":
      return "JSON patch";
    case "manual-instruction":
      return "Manual guidance";
    case "new-resource":
      return "New resource";
    default:
      return "Suggested fix";
  }
}

export function getFixSnippetHeading(fix: K8sFixSuggestion) {
  switch (fix.type) {
    case "manual-instruction":
      return fix.copyableContent ? "Suggested template" : "Manual review note";
    case "new-resource":
      return "Suggested resource";
    case "strategic-merge-patch-like":
    case "json-patch-like":
      return "Suggested patch";
    case "yaml-snippet":
    default:
      return "Suggested template";
  }
}

export function buildDisplayFixSnippet(fix: K8sFixSuggestion) {
  const snippet = fix.copyableContent?.trimEnd();

  if (snippet) {
    return snippet;
  }

  return toCommentBlock([
    "Manual review required",
    fix.title,
    fix.type === "manual-instruction" ? fix.instructions : fix.summary,
    `Risk note: ${fix.riskNote}`,
  ]);
}

export function buildFixCopyValue(finding: K8sFinding) {
  if (!finding.fix) {
    return undefined;
  }

  const snippet = buildDisplayFixSnippet(finding.fix);

  return [
    `Finding: ${finding.title}`,
    `Resource: ${formatResourceRef(finding.resourceRef)}`,
    `Fix: ${finding.fix.title}`,
    `Fix type: ${formatK8sFixTypeLabel(finding.fix.type)}`,
    `Risk note: ${finding.fix.riskNote}`,
    ...getFixCustomizationWarnings(finding).map((warning) => `Review note: ${warning}`),
    `${getFixSnippetHeading(finding.fix)}:\n${snippet}`,
  ].join("\n\n");
}

export function buildSafeCopyFixBundle(findings: readonly K8sFinding[]) {
  const safeCopyFindings = findings.filter(hasCopyableFixSnippet);

  if (safeCopyFindings.length === 0) {
    return "";
  }

  return safeCopyFindings
    .map((finding, index) => {
      const fix = finding.fix;

      if (!fix?.copyableContent) {
        return "";
      }

      return [
        `# ${index + 1}. ${fix.title}`,
        `# Finding: ${finding.title}`,
        `# Resource: ${formatResourceRef(finding.resourceRef)}`,
        `# Category: ${finding.category}`,
        `# Review before applying: ${fix.riskNote}`,
        ...getFixCustomizationWarnings(finding).map(
          (warning) => `# Review note: ${warning}`,
        ),
        "",
        fix.copyableContent.trimEnd(),
      ].join("\n");
    })
    .filter((value) => value.length > 0)
    .join("\n\n---\n\n");
}

export function getFixCustomizationWarnings(finding: K8sFinding) {
  const fix = finding.fix;

  if (!fix) {
    return [];
  }

  const warnings = new Set<string>();
  const snippet = fix.copyableContent?.toLowerCase() ?? "";

  if (
    snippet.includes("placeholder") ||
    snippet.includes("change_me") ||
    snippet.includes("template only") ||
    snippet.includes("example only")
  ) {
    warnings.add(
      "This suggestion contains placeholders or examples. Replace them with values from your own workload before applying it.",
    );
  }

  switch (finding.ruleId) {
    case "missing-readiness-probe":
    case "missing-liveness-probe":
    case "startup-probe-suggestion":
    case "probe-port-mismatch":
      warnings.add(
        "Customize the probe path, port, and timing. Generic /readyz or /livez endpoints are not universally correct.",
      );
      break;
    case "missing-resource-requests":
    case "missing-resource-limits":
      warnings.add(
        "Do not treat the CPU and memory values as defaults. Size them from real usage, latency goals, and throttling data.",
      );
      break;
    case "ingress-without-tls":
      warnings.add(
        "Replace the example host list and TLS secret name with the certificate mapping your ingress controller actually uses.",
      );
      break;
    case "networkpolicy-absent-for-namespace":
      warnings.add(
        "A default-deny NetworkPolicy can break ingress or egress immediately. Stage explicit allow rules before rollout.",
      );
      break;
    case "literal-sensitive-env-var":
      warnings.add(
        "Replace the example Secret name and key with your real secret reference. The original value is intentionally redacted and never shown here.",
      );
      break;
    case "missing-namespace":
      warnings.add(
        "Replace the namespace placeholder with the actual destination namespace for this resource.",
      );
      break;
    case "missing-owner-team-annotations":
      warnings.add(
        "Swap the placeholder owner and team values for the real operational owner metadata used by your organization.",
      );
      break;
    case "missing-recommended-app-labels":
      warnings.add(
        "Review labels like component, part-of, and managed-by so they match your platform vocabulary instead of placeholder values.",
      );
      break;
    case "missing-pod-disruption-budget":
    case "pdb-too-restrictive":
      warnings.add(
        "Confirm the selector and disruption budget against rollout, drain, and maintenance behavior before using this suggestion.",
      );
      break;
    case "service-selector-matches-nothing":
      warnings.add(
        "Verify the target workload labels carefully. Selector mistakes can reroute traffic to the wrong pods or to none at all.",
      );
      break;
    case "single-replica-deployment":
    case "deployment-max-unavailable-risk":
      warnings.add(
        "Replica and rollout changes affect capacity, cost, autoscaling behavior, and PodDisruptionBudget math.",
      );
      break;
    case "mutable-image-tag":
      warnings.add(
        "Replace the example tag or digest with an artifact produced, scanned, and approved by your release pipeline.",
      );
      break;
    case "deprecated-api-version":
    case "podsecuritypolicy-removed":
      warnings.add(
        "Review the full resource schema after changing apiVersion. A direct version edit may not be enough.",
      );
      break;
    default:
      break;
  }

  if (fix.type === "manual-instruction" && !fix.copyableContent) {
    warnings.add(
      "This fix stays manual because the analyzer could not infer a trustworthy manifest patch from the available context.",
    );
  }

  return [...warnings];
}

function buildFixBucket(
  id: K8sFixBucketId,
  findings: readonly K8sFinding[],
): K8sFixBucket {
  const byCategory = new Map<K8sFindingCategory, K8sFinding[]>();

  for (const finding of findings) {
    const categoryFindings = byCategory.get(finding.category) ?? [];
    categoryFindings.push(finding);
    byCategory.set(finding.category, categoryFindings);
  }

  const categories = [...byCategory.entries()]
    .sort(([left], [right]) => categoryRank[left] - categoryRank[right])
    .map(([category, categoryFindings]) => ({
      category,
      resources: buildResourceGroups(categoryFindings),
      count: categoryFindings.length,
    }));

  return {
    id,
    findings: sortFixFindings(findings),
    categories,
    count: findings.length,
  };
}

function buildResourceGroups(findings: readonly K8sFinding[]): K8sFixResourceGroup[] {
  const byResource = new Map<string, K8sFinding[]>();

  for (const finding of findings) {
    const key = getResourceGroupKey(finding.resourceRef);
    const resourceFindings = byResource.get(key) ?? [];
    resourceFindings.push(finding);
    byResource.set(key, resourceFindings);
  }

  return [...byResource.entries()]
    .map(([, resourceFindings]) => ({
      id: getResourceGroupKey(resourceFindings[0]!.resourceRef),
      resourceRef: resourceFindings[0]!.resourceRef,
      findings: sortFixFindings(resourceFindings),
      count: resourceFindings.length,
    }))
    .sort((left, right) => compareResourceRefs(left.resourceRef, right.resourceRef));
}

function sortFixFindings(findings: readonly K8sFinding[]) {
  return [...findings].sort((left, right) => {
    const severityDelta =
      getFindingSeverityRank(right.severity) - getFindingSeverityRank(left.severity);

    if (severityDelta !== 0) {
      return severityDelta;
    }

    const resourceDelta = compareResourceRefs(left.resourceRef, right.resourceRef);

    if (resourceDelta !== 0) {
      return resourceDelta;
    }

    return left.title.localeCompare(right.title);
  });
}

function compareResourceRefs(left: K8sObjectRef, right: K8sObjectRef) {
  const namespaceDelta = (left.namespace ?? "").localeCompare(right.namespace ?? "");

  if (namespaceDelta !== 0) {
    return namespaceDelta;
  }

  const kindDelta = (left.kind ?? "").localeCompare(right.kind ?? "");

  if (kindDelta !== 0) {
    return kindDelta;
  }

  const nameDelta = (left.name ?? "").localeCompare(right.name ?? "");

  if (nameDelta !== 0) {
    return nameDelta;
  }

  return left.documentIndex - right.documentIndex;
}

function getResourceGroupKey(ref: K8sObjectRef) {
  return [
    ref.namespace ?? "__cluster__",
    ref.kind ?? "__unknown__",
    ref.name ?? "__unknown__",
    ref.documentIndex,
  ].join("|");
}

function formatResourceRef(ref: K8sObjectRef) {
  if (ref.kind && ref.name) {
    return ref.namespace ? `${ref.kind}/${ref.name} (${ref.namespace})` : `${ref.kind}/${ref.name}`;
  }

  if (ref.kind) {
    return ref.namespace ? `${ref.kind} (${ref.namespace})` : ref.kind;
  }

  return ref.documentIndex >= 0 ? `Document ${ref.documentIndex + 1}` : "Manifest input";
}

function toCommentBlock(lines: readonly string[]) {
  return lines
    .flatMap((line) => line.split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `# ${line}`)
    .join("\n");
}
