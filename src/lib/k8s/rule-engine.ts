import {
  createFinding,
  createSchemaFindingFromParseError,
  dedupeFindings,
  elevateFindingSeverity,
  findingCategories,
  findingSeverities,
  sortFindings,
} from "@/lib/k8s/findings";
import { resolveAnalyzerOptions } from "@/lib/k8s/profiles";
import { calculateReadinessScore } from "@/lib/k8s/scoring";
import type {
  K8sAnalysisReport,
  K8sAnalyzerOptions,
  K8sCategorySummary,
  K8sExtractedResource,
  K8sFinding,
  K8sFindingSeverity,
  K8sParseResult,
  K8sRelationshipGraph,
  K8sResourceCounts,
  K8sRule,
  K8sRuleContext,
} from "@/lib/k8s/types";

type RunK8sRuleEngineInput = {
  raw: string;
  parseResult: K8sParseResult;
  relationshipGraph: K8sRelationshipGraph;
  rules?: readonly K8sRule[];
  options?: K8sAnalyzerOptions;
};

export function runK8sRuleEngine({
  raw,
  parseResult,
  relationshipGraph,
  rules = [],
  options,
}: RunK8sRuleEngineInput): K8sAnalysisReport {
  const { profile, options: resolvedOptions } = resolveAnalyzerOptions(options);
  const filteredGraph = filterRelationshipGraphByNamespace(
    relationshipGraph,
    resolvedOptions.namespaceFilter,
  );
  const fatalParseErrors = parseResult.errors.filter(
    (error) => error.severity === "error",
  );
  const schemaFindings = [
    ...parseResult.errors.map(createSchemaFindingFromParseError),
    ...parseResult.warnings.map(createSchemaFindingFromParseError),
  ];
  const ruleContext: K8sRuleContext = {
    raw,
    parseResult,
    relationshipGraph: filteredGraph,
    documents: parseResult.documents,
    resources: filteredGraph.resources,
    workloads: filteredGraph.workloads,
    services: filteredGraph.services,
    podDisruptionBudgets: filteredGraph.podDisruptionBudgets,
    horizontalPodAutoscalers: filteredGraph.horizontalPodAutoscalers,
    networkPolicies: filteredGraph.networkPolicies,
    profile,
    options: resolvedOptions,
  };
  const ruleFindings =
    fatalParseErrors.length > 0 ? [] : executeRulesSafely(rules, ruleContext);
  const findings = sortFindings(
    dedupeFindings(
      [...schemaFindings, ...ruleFindings].filter((finding) => {
        if (
          !resolvedOptions.includeInfoFindings &&
          finding.severity === "info"
        ) {
          return false;
        }

        const namespaceFilter = resolvedOptions.namespaceFilter;

        if (!namespaceFilter) {
          return true;
        }

        return (
          finding.resourceRef.namespace === undefined ||
          finding.resourceRef.namespace === namespaceFilter
        );
      }),
    ),
  );
  const state = getReportState(raw, fatalParseErrors.length > 0);

  return {
    ok: fatalParseErrors.length === 0,
    state,
    message: getReportMessage(state, findings.length),
    raw,
    options: resolvedOptions,
    profile,
    parseResult,
    relationshipGraph: filteredGraph,
    findings,
    fatalParseErrors,
    readinessScore: calculateReadinessScore(findings),
    categoryCounts: buildCategoryCounts(findings),
    severityCounts: buildSeverityCounts(findings),
    categorySummaries: buildCategorySummaries(findings),
    resourceCounts: buildResourceCounts(filteredGraph.resources),
  };
}

function executeRulesSafely(
  rules: readonly K8sRule[],
  context: K8sRuleContext,
) {
  const findings: K8sFinding[] = [];

  for (const rule of rules) {
    const override = context.profile.ruleOverrides[rule.id];

    if (override?.enabled === false) {
      continue;
    }

    try {
      const output = rule.run(context);
      const normalizedFindings = normalizeRuleFindings(output);
      const appliedFindings = normalizedFindings
        .map((finding) => applyRuleMetadata(rule, finding, context))
        .filter((finding): finding is K8sFinding => finding !== undefined);

      findings.push(...appliedFindings);
    } catch (error) {
      findings.push(
        createFinding({
          id: `engine:${rule.id}`,
          ruleId: rule.id,
          title: `Rule "${rule.title}" failed`,
          message: `The analyzer skipped rule "${rule.id}" after an unexpected error.`,
          severity: "low",
          category: "schema",
          resourceRef: {
            documentIndex: -1,
            apiVersion: undefined,
            kind: undefined,
            name: undefined,
            namespace: undefined,
          },
          whyItMatters:
            error instanceof Error
              ? error.message
              : "The rule raised an unknown exception.",
          recommendation:
            "Treat this as an analyzer issue and continue reviewing the remaining findings.",
          confidence: "low",
        }),
      );
    }
  }

  return findings;
}

function normalizeRuleFindings(output: K8sFinding[] | K8sFinding | void) {
  if (!output) {
    return [];
  }

  return Array.isArray(output) ? output : [output];
}

function applyRuleMetadata(
  rule: K8sRule,
  finding: K8sFinding,
  context: K8sRuleContext,
): K8sFinding | undefined {
  const override = context.profile.ruleOverrides[rule.id];
  let severity = override?.severity ?? finding.severity ?? rule.defaultSeverity;

  if (
    context.options.strictSecurity &&
    finding.category === "security" &&
    override?.severity === undefined
  ) {
    severity = elevateFindingSeverity(severity);
  }

  if (!context.options.includeInfoFindings && severity === "info") {
    return undefined;
  }

  return createFinding({
    id: finding.id,
    ruleId: rule.id,
    title: finding.title,
    message: finding.message,
    severity,
    category: finding.category,
    resourceRef: finding.resourceRef,
    location: finding.location,
    whyItMatters: finding.whyItMatters,
    recommendation: finding.recommendation,
    fix: finding.fix,
    docsUrl: finding.docsUrl ?? rule.docsUrl,
    confidence: finding.confidence,
  });
}

function filterRelationshipGraphByNamespace(
  graph: K8sRelationshipGraph,
  namespace: string | undefined,
): K8sRelationshipGraph {
  if (!namespace) {
    return graph;
  }

  const resources = graph.resources.filter(
    (resource) =>
      resource.namespace === undefined || resource.namespace === namespace,
  );
  const resourceIds = new Set(resources.map((resource) => resource.id));

  return {
    resources,
    workloads: graph.workloads.filter((resource) =>
      resourceIds.has(resource.id),
    ),
    services: graph.services.filter((resource) => resourceIds.has(resource.id)),
    podDisruptionBudgets: graph.podDisruptionBudgets.filter((resource) =>
      resourceIds.has(resource.id),
    ),
    horizontalPodAutoscalers: graph.horizontalPodAutoscalers.filter(
      (resource) => resourceIds.has(resource.id),
    ),
    networkPolicies: graph.networkPolicies.filter((resource) =>
      resourceIds.has(resource.id),
    ),
    relationships: graph.relationships.filter(
      (relationship) =>
        resourceIds.has(relationship.sourceId) &&
        resourceIds.has(relationship.targetId),
    ),
    issues: graph.issues.filter(
      (issue) => issue.namespace === undefined || issue.namespace === namespace,
    ),
    namespaces: graph.namespaces.filter((value) => value === namespace),
  };
}

function buildCategoryCounts(findings: K8sFinding[]) {
  return findingCategories.reduce(
    (counts, category) => {
      counts[category] = findings.filter(
        (finding) => finding.category === category,
      ).length;
      return counts;
    },
    {} as Record<K8sFinding["category"], number>,
  );
}

function buildSeverityCounts(findings: K8sFinding[]) {
  return findingSeverities.reduce(
    (counts, severity) => {
      counts[severity] = findings.filter(
        (finding) => finding.severity === severity,
      ).length;
      return counts;
    },
    {} as Record<K8sFindingSeverity, number>,
  );
}

function buildCategorySummaries(findings: K8sFinding[]) {
  return findingCategories.reduce(
    (summaries, category) => {
      const categoryFindings = findings.filter(
        (finding) => finding.category === category,
      );

      summaries[category] = {
        category,
        total: categoryFindings.length,
        bySeverity: buildSeverityCounts(categoryFindings),
      } satisfies K8sCategorySummary;

      return summaries;
    },
    {} as Record<K8sFinding["category"], K8sCategorySummary>,
  );
}

function buildResourceCounts(
  resources: K8sExtractedResource[],
): K8sResourceCounts {
  return {
    total: resources.length,
    byKind: resources.reduce(
      (counts, resource) => {
        counts[resource.kind] = (counts[resource.kind] ?? 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    ),
  };
}

function getReportState(raw: string, hasFatalParseErrors: boolean) {
  if (raw.trim().length === 0) {
    return "empty";
  }

  return hasFatalParseErrors ? "invalid" : "ready";
}

function getReportMessage(
  state: K8sAnalysisReport["state"],
  findingCount: number,
) {
  switch (state) {
    case "empty":
      return "Paste Kubernetes YAML to generate a production-readiness report.";
    case "invalid":
      return "Fix the YAML or schema issues first, then rerun the analyzer.";
    case "ready":
      return findingCount === 0
        ? "No findings were produced for the current manifest set."
        : "Analysis completed successfully.";
  }
}
