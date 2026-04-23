import {
  getFindingConfidenceWeight,
  getFindingSeverityRank,
} from "@/lib/k8s/findings";
import { clamp } from "@/lib/utils";
import type {
  K8sAnalysisReport,
  K8sAnalyzerProfileId,
  K8sFinding,
  K8sFindingCategory,
  K8sFindingSeverity,
  K8sManifestDocument,
  K8sParseResult,
  K8sPositiveCheck,
  K8sReadinessGrade,
  K8sRelationshipGraph,
  K8sResourceSummary,
  K8sRiskLevel,
  K8sScorecardCategory,
  K8sWorkloadKind,
  K8sWorkloadResource,
} from "@/lib/k8s/types";

type BuildReadinessScorecardInput = {
  findings: K8sFinding[];
  parseResult: K8sParseResult;
  relationshipGraph: K8sRelationshipGraph;
  profileId: K8sAnalyzerProfileId;
  state: K8sAnalysisReport["state"];
};

type K8sScorecardResult = Pick<
  K8sAnalysisReport,
  | "readinessScore"
  | "readinessGrade"
  | "riskLevel"
  | "headline"
  | "summary"
  | "nextSteps"
  | "canShareReportSafely"
  | "categoryScores"
  | "resourceSummary"
  | "fixFirstFindings"
  | "positiveChecks"
  | "scoreBreakdown"
>;

type WorkloadContainer = {
  workload: K8sWorkloadResource;
  name: string;
  record: Record<string, unknown>;
};

const STARTING_SCORE = 100;
const LONG_RUNNING_WORKLOAD_KINDS = new Set<K8sWorkloadKind>([
  "Pod",
  "Deployment",
  "StatefulSet",
  "DaemonSet",
  "ReplicaSet",
]);
const PRODUCTION_STYLE_WORKLOAD_KINDS = new Set<K8sWorkloadKind>([
  "Pod",
  "Deployment",
  "StatefulSet",
  "DaemonSet",
  "ReplicaSet",
]);
const secretDetectionRuleIds = new Set([
  "literal-secret-values",
  "literal-sensitive-env-var",
]);
const securityHardeningRuleIds = new Set([
  "privileged-container",
  "allow-privilege-escalation",
  "run-as-non-root",
  "run-as-user-root",
  "missing-seccomp-profile",
  "capabilities-not-dropping-all",
  "dangerous-capabilities-added",
  "read-only-root-filesystem",
  "container-may-run-as-root-by-default",
]);
const readinessScoreCategoryCaps: Record<K8sScorecardCategory, number> = {
  reliability: 30,
  security: 32,
  networking: 24,
  operations: 20,
  "api-version": 16,
};

export const readinessSeverityWeights: Record<K8sFindingSeverity, number> = {
  critical: 34,
  high: 18,
  medium: 8,
  low: 2,
  info: 0,
};

export const scorecardCategories = [
  "reliability",
  "security",
  "networking",
  "operations",
  "api-version",
] as const satisfies readonly K8sScorecardCategory[];

const profilePenaltyMultipliers: Record<
  K8sAnalyzerProfileId,
  Record<K8sScorecardCategory, number>
> = {
  balanced: {
    reliability: 1,
    security: 1,
    networking: 1,
    operations: 1,
    "api-version": 1,
  },
  strict: {
    reliability: 1.15,
    security: 1.1,
    networking: 1.1,
    operations: 1.1,
    "api-version": 1.05,
  },
  security: {
    reliability: 1,
    security: 1.35,
    networking: 1.15,
    operations: 1.05,
    "api-version": 1,
  },
  beginner: {
    reliability: 0.95,
    security: 0.9,
    networking: 0.95,
    operations: 0.9,
    "api-version": 0.95,
  },
};

export function calculateReadinessScore(
  findings: K8sFinding[],
  profileId: K8sAnalyzerProfileId = "balanced",
) {
  const breakdown = calculateDeductionBreakdown(findings, profileId);
  const score = STARTING_SCORE - breakdown.deductions;

  return clamp(Math.round(score), 0, 100);
}

export function buildReadinessScorecard({
  findings,
  parseResult,
  relationshipGraph,
  profileId,
  state,
}: BuildReadinessScorecardInput): K8sScorecardResult {
  const resourceSummary = buildResourceSummary(parseResult, relationshipGraph);
  const positiveChecks = buildPositiveChecks(
    parseResult,
    relationshipGraph,
    findings,
  );
  const bonusPoints = Math.min(
    8,
    positiveChecks.reduce(
      (total, check) => total + getPositiveCheckBonus(check.id),
      0,
    ),
  );
  const breakdown = calculateDeductionBreakdown(findings, profileId);
  const fatalPenalty = getFatalPenalty(parseResult);
  const criticalCount = findings.filter(
    (finding) => finding.severity === "critical",
  ).length;
  const highCount = findings.filter(
    (finding) => finding.severity === "high",
  ).length;
  const rawScore =
    STARTING_SCORE - breakdown.deductions - fatalPenalty + bonusPoints;
  const severityCappedScore =
    state === "invalid"
      ? Math.min(rawScore, 20)
      : criticalCount >= 2
        ? Math.min(rawScore, 40)
        : criticalCount === 1
          ? Math.min(rawScore, 55)
          : highCount >= 2
            ? Math.min(rawScore, 74)
            : highCount === 1
              ? Math.min(rawScore, 82)
              : rawScore;
  const readinessScore = clamp(Math.round(severityCappedScore), 0, 100);
  const readinessGrade = getReadinessGrade(readinessScore);
  const riskLevel = getRiskLevel(state, readinessScore, findings);
  const fixFirstFindings = selectFixFirstFindings(findings, profileId);
  const categoryScores = buildCategoryScores(breakdown.deductionsByCategory);
  const canShareReportSafely = findings.every(
    (finding) => !secretDetectionRuleIds.has(finding.ruleId),
  );

  return {
    readinessScore,
    readinessGrade,
    riskLevel,
    headline: buildHeadline(state, readinessGrade, findings),
    summary: buildSummary(
      state,
      readinessScore,
      findings,
      resourceSummary,
      positiveChecks,
    ),
    nextSteps: buildNextSteps(state, fixFirstFindings, positiveChecks),
    canShareReportSafely,
    categoryScores,
    resourceSummary,
    fixFirstFindings,
    positiveChecks,
    scoreBreakdown: {
      startingScore: STARTING_SCORE,
      deductions: breakdown.deductions,
      bonusPoints,
      fatalPenalty,
      deductionsByCategory: breakdown.deductionsByCategory,
      categoryCaps: readinessScoreCategoryCaps,
      profilePenaltyMultipliers: profilePenaltyMultipliers[profileId],
    },
  };
}

export function buildResourceSummary(
  parseResult: K8sParseResult,
  relationshipGraph: K8sRelationshipGraph,
): K8sResourceSummary {
  const namespaces = new Set<string>(relationshipGraph.namespaces);

  for (const document of parseResult.documents) {
    if (document.kind === "Namespace" && document.metadata.name) {
      namespaces.add(document.metadata.name);
      continue;
    }

    if (document.metadata.namespace) {
      namespaces.add(document.metadata.namespace);
    }
  }

  return {
    totalObjects: parseResult.documents.length,
    namespacesFound: [...namespaces].sort((left, right) =>
      left.localeCompare(right),
    ),
    workloadsFound: relationshipGraph.workloads.length,
    servicesFound: relationshipGraph.services.length,
    ingressesFound: relationshipGraph.resources.filter(
      (resource) => resource.category === "ingress",
    ).length,
    pdbsFound: relationshipGraph.podDisruptionBudgets.length,
    networkPoliciesFound: relationshipGraph.networkPolicies.length,
  };
}

function calculateDeductionBreakdown(
  findings: K8sFinding[],
  profileId: K8sAnalyzerProfileId,
) {
  const deductionsByCategory = scorecardCategories.reduce(
    (result, category) => {
      const categoryFindings = findings
        .filter(
          (finding) =>
            mapFindingCategoryToScorecardCategory(finding.category) ===
            category,
        )
        .map((finding) => calculateWeightedPenalty(finding, profileId))
        .filter((penalty) => penalty > 0)
        .sort((left, right) => right - left);

      const categoryDeduction = categoryFindings.reduce(
        (total, penalty, index) => {
          return total + penalty * getDeductionDiminishingFactor(index);
        },
        0,
      );

      result[category] = roundScore(
        Math.min(readinessScoreCategoryCaps[category], categoryDeduction),
      );

      return result;
    },
    {} as Record<K8sScorecardCategory, number>,
  );

  return {
    deductionsByCategory,
    deductions: roundScore(
      Object.values(deductionsByCategory).reduce(
        (total, value) => total + value,
        0,
      ),
    ),
  };
}

function calculateWeightedPenalty(
  finding: K8sFinding,
  profileId: K8sAnalyzerProfileId,
) {
  const basePenalty = readinessSeverityWeights[finding.severity];

  if (basePenalty === 0) {
    return 0;
  }

  const scorecardCategory = mapFindingCategoryToScorecardCategory(
    finding.category,
  );
  const profileMultiplier =
    profilePenaltyMultipliers[profileId][scorecardCategory];

  return (
    basePenalty *
    getFindingConfidenceWeight(finding.confidence) *
    profileMultiplier
  );
}

function getDeductionDiminishingFactor(index: number) {
  if (index < 3) {
    return 1;
  }

  if (index < 6) {
    return 0.65;
  }

  return 0.35;
}

function mapFindingCategoryToScorecardCategory(
  category: K8sFindingCategory,
): K8sScorecardCategory {
  switch (category) {
    case "security":
      return "security";
    case "networking":
      return "networking";
    case "api-version":
      return "api-version";
    case "reliability":
    case "scalability":
      return "reliability";
    case "operations":
    case "schema":
    case "best-practice":
    case "cost":
      return "operations";
  }
}

function buildCategoryScores(
  deductionsByCategory: Record<K8sScorecardCategory, number>,
) {
  return scorecardCategories.reduce(
    (scores, category) => {
      const cap = readinessScoreCategoryCaps[category];
      const deduction = deductionsByCategory[category];
      const score = clamp(Math.round(((cap - deduction) / cap) * 100), 0, 100);

      scores[category] = score;
      return scores;
    },
    {} as Record<K8sScorecardCategory, number>,
  );
}

function getReadinessGrade(score: number): K8sReadinessGrade {
  if (score >= 90) {
    return "Production ready with minor notes";
  }

  if (score >= 75) {
    return "Mostly ready, review warnings";
  }

  if (score >= 60) {
    return "Needs production fixes";
  }

  if (score >= 40) {
    return "High risk";
  }

  return "Not production ready";
}

function getRiskLevel(
  state: K8sAnalysisReport["state"],
  score: number,
  findings: K8sFinding[],
): K8sRiskLevel {
  if (
    state === "invalid" ||
    findings.some((finding) => finding.severity === "critical") ||
    score < 40
  ) {
    return "critical";
  }

  if (findings.some((finding) => finding.severity === "high") || score < 60) {
    return "high";
  }

  if (findings.some((finding) => finding.severity === "medium") || score < 75) {
    return "moderate";
  }

  return "low";
}

function buildHeadline(
  state: K8sAnalysisReport["state"],
  grade: K8sReadinessGrade,
  findings: K8sFinding[],
) {
  if (state === "empty") {
    return "Paste Kubernetes YAML to start a production-readiness review";
  }

  if (state === "invalid") {
    return "Not production ready";
  }

  const criticalCount = findings.filter(
    (finding) => finding.severity === "critical",
  ).length;
  const highCount = findings.filter(
    (finding) => finding.severity === "high",
  ).length;

  if (criticalCount > 0) {
    return `${grade}: critical fixes block shipment`;
  }

  if (highCount > 0) {
    return `${grade}: high-risk issues need review`;
  }

  return grade;
}

function buildSummary(
  state: K8sAnalysisReport["state"],
  score: number,
  findings: K8sFinding[],
  resourceSummary: K8sResourceSummary,
  positiveChecks: K8sPositiveCheck[],
) {
  if (state === "empty") {
    return "Paste one or more Kubernetes objects to generate a production-readiness scorecard.";
  }

  if (state === "invalid") {
    return `The manifest set could not be fully evaluated because fatal YAML or schema issues were found. Fix those first, then rerun the analyzer before trusting workload, security, or networking guidance.`;
  }

  if (findings.length === 0) {
    return `Analyzed ${resourceSummary.totalObjects} object${resourceSummary.totalObjects === 1 ? "" : "s"} across ${resourceSummary.namespacesFound.length} namespace${resourceSummary.namespacesFound.length === 1 ? "" : "s"}. No production-readiness findings were produced for this profile.`;
  }

  const blockingCount = findings.filter(
    (finding) => finding.severity === "critical" || finding.severity === "high",
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "medium" || finding.severity === "low",
  ).length;
  const positiveSummary =
    positiveChecks.length > 0
      ? ` Positive checks noted: ${positiveChecks
          .slice(0, 2)
          .map((check) => check.title.toLowerCase())
          .join("; ")}.`
      : "";

  return `Score ${score}/100 after reviewing ${resourceSummary.totalObjects} object${resourceSummary.totalObjects === 1 ? "" : "s"} across ${resourceSummary.namespacesFound.length} namespace${resourceSummary.namespacesFound.length === 1 ? "" : "s"}. ${blockingCount} blocking issue${blockingCount === 1 ? "" : "s"} and ${warningCount} additional warning${warningCount === 1 ? "" : "s"} were found.${positiveSummary}`;
}

function buildNextSteps(
  state: K8sAnalysisReport["state"],
  fixFirstFindings: K8sFinding[],
  positiveChecks: K8sPositiveCheck[],
) {
  if (state === "empty") {
    return "Paste a manifest bundle, choose the target Kubernetes version and profile, then rerun the analyzer.";
  }

  if (state === "invalid") {
    return "Fix the fatal YAML or schema findings first. Runtime checks are incomplete until the manifest bundle parses cleanly.";
  }

  if (fixFirstFindings.length === 0) {
    return positiveChecks.length > 0
      ? "No must-fix issues were detected for this profile. Keep validating rollout behavior, access controls, and application-specific health endpoints before release."
      : "No major blockers were detected. Review any remaining informational notes against your cluster and application requirements before release.";
  }

  return `Fix first: ${fixFirstFindings
    .map((finding) => finding.title)
    .join(
      "; ",
    )}. After those are resolved, review the lower-severity findings before shipping.`;
}

function selectFixFirstFindings(
  findings: K8sFinding[],
  profileId: K8sAnalyzerProfileId,
) {
  return [...findings]
    .filter((finding) => finding.severity !== "info")
    .sort((left, right) => {
      const impactDelta =
        calculateWeightedPenalty(right, profileId) -
        calculateWeightedPenalty(left, profileId);

      if (impactDelta !== 0) {
        return impactDelta;
      }

      const severityDelta =
        getFindingSeverityRank(right.severity) -
        getFindingSeverityRank(left.severity);

      if (severityDelta !== 0) {
        return severityDelta;
      }

      return left.title.localeCompare(right.title);
    })
    .slice(0, 3);
}

function buildPositiveChecks(
  parseResult: K8sParseResult,
  relationshipGraph: K8sRelationshipGraph,
  findings: K8sFinding[],
) {
  const checks: K8sPositiveCheck[] = [];
  const longRunningContainers = getWorkloadContainers(
    relationshipGraph.workloads.filter((workload) =>
      LONG_RUNNING_WORKLOAD_KINDS.has(workload.kind),
    ),
  );
  const workloadContainers = getWorkloadContainers(relationshipGraph.workloads);
  const productionStyleContainers = getWorkloadContainers(
    relationshipGraph.workloads.filter((workload) =>
      PRODUCTION_STYLE_WORKLOAD_KINDS.has(workload.kind),
    ),
  );

  if (
    longRunningContainers.length > 0 &&
    longRunningContainers.every((container) =>
      isRecord(container.record.readinessProbe),
    )
  ) {
    checks.push({
      id: "readiness-probes-present",
      title: "Readiness probes present",
      summary:
        "Readiness probes are present on the long-running application containers in this manifest set.",
    });
  }

  if (
    workloadContainers.length > 0 &&
    workloadContainers.every((container) =>
      hasRecommendedResources(container.record),
    )
  ) {
    checks.push({
      id: "resources-configured",
      title: "Resources configured",
      summary:
        "CPU and memory requests are set, and memory limits are present for the reviewed workload containers.",
    });
  }

  if (hasPdbCoverage(parseResult, relationshipGraph, findings)) {
    checks.push({
      id: "pdb-present",
      title: "PDB present",
      summary:
        "A matching PodDisruptionBudget is present for the multi-replica Deployment and StatefulSet workloads in this manifest set.",
    });
  }

  if (
    productionStyleContainers.length > 0 &&
    findings.every(
      (finding) => !securityHardeningRuleIds.has(finding.ruleId),
    ) &&
    productionStyleContainers.every((container) =>
      hasHardenedSecurityContext(container.workload, container),
    )
  ) {
    checks.push({
      id: "securitycontext-hardened",
      title: "SecurityContext hardened",
      summary:
        "The reviewed app containers set non-root execution, privilege controls, capability drops, and seccomp hardening.",
    });
  }

  const ingressDocuments = parseResult.documents.filter(
    (document) => document.kind === "Ingress",
  );

  if (
    ingressDocuments.length > 0 &&
    ingressDocuments.every((document) => hasIngressTls(document))
  ) {
    checks.push({
      id: "ingress-tls-present",
      title: "Ingress TLS present",
      summary:
        "Ingress resources in this manifest set declare TLS configuration instead of leaving traffic termination entirely implicit.",
    });
  }

  return checks;
}

function hasPdbCoverage(
  parseResult: K8sParseResult,
  relationshipGraph: K8sRelationshipGraph,
  findings: K8sFinding[],
) {
  const eligibleWorkloads = relationshipGraph.workloads.filter((workload) => {
    if (workload.kind !== "Deployment" && workload.kind !== "StatefulSet") {
      return false;
    }

    return getReplicaCount(parseResult.documents, workload) >= 2;
  });

  if (eligibleWorkloads.length === 0) {
    return false;
  }

  if (
    findings.some(
      (finding) => finding.ruleId === "missing-pod-disruption-budget",
    )
  ) {
    return false;
  }

  return eligibleWorkloads.every((workload) =>
    relationshipGraph.relationships.some(
      (relationship) =>
        relationship.type === "pod-disruption-budget-targets" &&
        relationship.targetId === workload.id,
    ),
  );
}

function getReplicaCount(
  documents: K8sManifestDocument[],
  workload: K8sWorkloadResource,
) {
  const document = documents.find(
    (entry) => entry.index === workload.documentIndex,
  );
  const replicas = asNumber(isRecord(document?.raw.spec)?.replicas);

  return replicas ?? 1;
}

function getWorkloadContainers(workloads: K8sWorkloadResource[]) {
  return workloads.flatMap((workload) => {
    const containers = Array.isArray(workload.podTemplate.spec.containers)
      ? workload.podTemplate.spec.containers
      : [];

    return containers.flatMap((entry) => {
      const record = isRecord(entry);
      const name = asNonEmptyString(record?.name);

      if (!record || !name) {
        return [];
      }

      return [
        {
          workload,
          name,
          record,
        } satisfies WorkloadContainer,
      ];
    });
  });
}

function hasRecommendedResources(container: Record<string, unknown>) {
  const resources = isRecord(container.resources);
  const requests = isRecord(resources?.requests);
  const limits = isRecord(resources?.limits);

  return (
    hasQuantity(requests?.cpu) &&
    hasQuantity(requests?.memory) &&
    hasQuantity(limits?.memory)
  );
}

function hasHardenedSecurityContext(
  workload: K8sWorkloadResource,
  container: WorkloadContainer,
) {
  const podSecurityContext = isRecord(
    workload.podTemplate.spec.securityContext,
  );
  const containerSecurityContext = isRecord(container.record.securityContext);
  const capabilities = isRecord(containerSecurityContext?.capabilities);
  const droppedCapabilities = asStringArray(capabilities?.drop).map((value) =>
    value.toUpperCase(),
  );
  const seccompProfile =
    isRecord(containerSecurityContext?.seccompProfile) ??
    isRecord(podSecurityContext?.seccompProfile);
  const seccompType = asNonEmptyString(seccompProfile?.type);

  return (
    getEffectiveBoolean(
      containerSecurityContext,
      podSecurityContext,
      "runAsNonRoot",
    ) === true &&
    getEffectiveBoolean(
      containerSecurityContext,
      undefined,
      "allowPrivilegeEscalation",
    ) === false &&
    getEffectiveBoolean(
      containerSecurityContext,
      undefined,
      "readOnlyRootFilesystem",
    ) === true &&
    droppedCapabilities.includes("ALL") &&
    (seccompType === "RuntimeDefault" || seccompType === "Localhost")
  );
}

function hasIngressTls(document: K8sManifestDocument) {
  const spec = isRecord(document.raw.spec);
  return Array.isArray(spec?.tls) && spec.tls.length > 0;
}

function getFatalPenalty(parseResult: K8sParseResult) {
  const fatalCount = parseResult.errors.filter(
    (error) => error.severity === "error",
  ).length;

  if (fatalCount === 0) {
    return 0;
  }

  return Math.min(85, 60 + Math.max(0, fatalCount - 1) * 10);
}

function getPositiveCheckBonus(id: K8sPositiveCheck["id"]) {
  switch (id) {
    case "readiness-probes-present":
      return 2;
    case "resources-configured":
      return 2;
    case "pdb-present":
      return 1;
    case "securitycontext-hardened":
      return 2;
    case "ingress-tls-present":
      return 1;
    default:
      return 0;
  }
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function asNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const normalized = asNonEmptyString(entry);
    return normalized ? [normalized] : [];
  });
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return undefined;
  }

  return Number.parseInt(value.trim(), 10);
}

function hasQuantity(value: unknown) {
  return (
    (typeof value === "number" && Number.isFinite(value)) ||
    (typeof value === "string" && value.trim().length > 0)
  );
}

function isRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getEffectiveBoolean(
  primary: Record<string, unknown> | undefined,
  fallback: Record<string, unknown> | undefined,
  field: string,
) {
  const value = primary?.[field] ?? fallback?.[field];
  return typeof value === "boolean" ? value : undefined;
}
