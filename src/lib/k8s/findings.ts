import type {
  K8sFinding,
  K8sFindingCategory,
  K8sFindingConfidence,
  K8sFindingLocation,
  K8sFindingSeverity,
  K8sFixSuggestion,
  K8sObjectRef,
  K8sParseError,
} from "@/lib/k8s/types";

export const findingSeverities = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
] as const satisfies readonly K8sFindingSeverity[];

export const findingCategories = [
  "reliability",
  "security",
  "scalability",
  "networking",
  "operations",
  "api-version",
  "cost",
  "schema",
  "best-practice",
] as const satisfies readonly K8sFindingCategory[];

export const findingSeverityRanks: Record<K8sFindingSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export const findingConfidenceWeights: Record<K8sFindingConfidence, number> = {
  high: 1,
  medium: 0.7,
  low: 0.45,
};

const categoryRank = Object.fromEntries(
  findingCategories.map((category, index) => [category, index]),
) as Record<K8sFindingCategory, number>;

type CreateFindingInput = {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: K8sFindingSeverity;
  category: K8sFindingCategory;
  resourceRef: K8sObjectRef;
  location?: K8sFindingLocation | undefined;
  whyItMatters: string;
  recommendation: string;
  fix?: K8sFixSuggestion | undefined;
  docsUrl?: string | undefined;
  confidence?: K8sFindingConfidence;
};

export function createFinding({
  id,
  ruleId,
  title,
  message,
  severity,
  category,
  resourceRef,
  location,
  whyItMatters,
  recommendation,
  fix,
  docsUrl,
  confidence = "high",
}: CreateFindingInput): K8sFinding {
  return {
    id,
    ruleId,
    title,
    message,
    severity,
    category,
    resourceRef,
    location,
    whyItMatters,
    recommendation,
    fix,
    docsUrl,
    confidence,
    suggestion: recommendation,
  };
}

export function createSchemaFindingFromParseError(
  parseError: K8sParseError,
): K8sFinding {
  const documentIndex = parseError.documentIndex ?? -1;
  const resourceRef: K8sObjectRef = parseError.ref ?? {
    documentIndex,
    apiVersion: undefined,
    kind: undefined,
    name: undefined,
    namespace: undefined,
  };

  return createFinding({
    id: `schema:${parseError.code}:${documentIndex}:${parseError.path ?? "document"}`,
    ruleId: `schema/${parseError.code}`,
    title: getSchemaFindingTitle(parseError.code),
    message: parseError.message,
    severity: parseError.severity === "error" ? "critical" : "low",
    category: "schema",
    resourceRef,
    location:
      parseError.documentIndex !== undefined ||
      parseError.location ||
      parseError.path
        ? {
            documentIndex,
            path: parseError.path,
            source: parseError.location,
          }
        : undefined,
    whyItMatters:
      parseError.detail ??
      "The analyzer needs valid, well-shaped Kubernetes objects before it can evaluate production-readiness rules reliably.",
    recommendation: getSchemaRecommendation(parseError.code),
    confidence: "high",
  });
}

export function dedupeFindings(findings: K8sFinding[]) {
  const deduped = new Map<string, K8sFinding>();

  for (const finding of findings) {
    const key = [
      finding.ruleId,
      finding.severity,
      finding.category,
      finding.resourceRef.namespace ?? "",
      finding.resourceRef.kind ?? "",
      finding.resourceRef.name ?? "",
      finding.location?.documentIndex ?? "",
      finding.location?.path ?? "",
      finding.title,
      finding.message,
    ].join("|");

    if (!deduped.has(key)) {
      deduped.set(key, finding);
    }
  }

  return [...deduped.values()];
}

export function sortFindings(findings: K8sFinding[]) {
  return [...findings].sort((left, right) => {
    const severityDelta =
      findingSeverityRanks[right.severity] - findingSeverityRanks[left.severity];

    if (severityDelta !== 0) {
      return severityDelta;
    }

    const categoryDelta =
      categoryRank[left.category] - categoryRank[right.category];

    if (categoryDelta !== 0) {
      return categoryDelta;
    }

    const namespaceDelta = compareStrings(
      left.resourceRef.namespace,
      right.resourceRef.namespace,
    );

    if (namespaceDelta !== 0) {
      return namespaceDelta;
    }

    const kindDelta = compareStrings(
      left.resourceRef.kind,
      right.resourceRef.kind,
    );

    if (kindDelta !== 0) {
      return kindDelta;
    }

    const nameDelta = compareStrings(
      left.resourceRef.name,
      right.resourceRef.name,
    );

    if (nameDelta !== 0) {
      return nameDelta;
    }

    return compareStrings(left.title, right.title);
  });
}

export function elevateFindingSeverity(
  severity: K8sFindingSeverity,
): K8sFindingSeverity {
  switch (severity) {
    case "info":
      return "low";
    case "low":
      return "medium";
    case "medium":
      return "high";
    case "high":
      return "critical";
    case "critical":
      return "critical";
  }
}

export function compareFindingSeverity(
  left: K8sFindingSeverity,
  right: K8sFindingSeverity,
) {
  return findingSeverityRanks[left] - findingSeverityRanks[right];
}

export function getFindingSeverityRank(severity: K8sFindingSeverity) {
  return findingSeverityRanks[severity];
}

export function getFindingConfidenceWeight(confidence: K8sFindingConfidence) {
  return findingConfidenceWeights[confidence];
}

function compareStrings(left: string | undefined, right: string | undefined) {
  return (left ?? "").localeCompare(right ?? "");
}

function getSchemaFindingTitle(code: K8sParseError["code"]) {
  switch (code) {
    case "yaml-syntax":
      return "YAML syntax error";
    case "missing-api-version":
      return 'Missing required field "apiVersion"';
    case "missing-kind":
      return 'Missing required field "kind"';
    case "missing-metadata-name":
      return 'Missing required field "metadata.name"';
    case "non-object-document":
      return "Document is not a Kubernetes object";
    case "input-too-large":
      return "Large manifest input";
    case "yaml-warning":
      return "YAML warning";
  }
}

function getSchemaRecommendation(code: K8sParseError["code"]) {
  switch (code) {
    case "yaml-syntax":
      return "Fix the YAML syntax before running production-readiness checks.";
    case "missing-api-version":
      return 'Add an "apiVersion" field to the resource.';
    case "missing-kind":
      return 'Add a Kubernetes "kind" field to the resource.';
    case "missing-metadata-name":
      return 'Add a stable "metadata.name" so the resource can be identified.';
    case "non-object-document":
      return "Replace the document with a YAML object that represents a Kubernetes resource.";
    case "input-too-large":
      return "Trim the pasted manifest set or split it into smaller batches for faster local analysis.";
    case "yaml-warning":
      return "Review the warning and normalize the YAML before relying on automated analysis.";
  }
}
