import type {
  K8sAnalysisReport,
  K8sFinding,
  K8sFixSuggestion,
  K8sParseError,
  K8sRelationshipGraph,
} from "@/lib/k8s/types";
import {
  buildExportableManifestText,
  redactK8sValueForDisplay,
} from "@/lib/k8s/privacy";
import { buildK8sHtmlReport } from "@/lib/k8s/report-html";
import {
  buildK8sMarkdownReport,
  type K8sMarkdownReportOptions,
} from "@/lib/k8s/report-markdown";
import { buildSafeCopyFixBundle } from "@/lib/k8s/fix-checklist";

export type K8sReportExportOptions = K8sMarkdownReportOptions & {
  includeRawInput?: boolean;
  redactSensitiveOutput?: boolean;
};

export function buildK8sJsonExport(
  report: K8sAnalysisReport,
  options: K8sReportExportOptions = {},
) {
  return JSON.stringify(buildK8sJsonExportObject(report, options), null, 2);
}

export function buildK8sJsonExportObject(
  report: K8sAnalysisReport,
  options: K8sReportExportOptions = {},
) {
  const generatedAt = toExportTimestamp(options.generatedAt);
  const includeRawInput = options.includeRawInput === true;
  const redactSensitiveOutput = options.redactSensitiveOutput !== false;
  const rawInput = includeRawInput
    ? buildExportableManifestText(report, {
        redactSensitiveOutput,
      })
    : undefined;

  const exportObject = {
    exportMetadata: {
      generatedAt,
      generatedLocallyInBrowser: true,
      reviewType: "static-manifest-review",
      includesRawInput: includeRawInput,
      redactedByDefault: redactSensitiveOutput,
      privacyWarning: getPrivacyWarning(report) ?? undefined,
    },
    report: {
      ok: report.ok,
      state: report.state,
      message: report.message,
      headline: report.headline,
      summary: report.summary,
      nextSteps: report.nextSteps,
      options: report.options,
      profile: {
        id: report.profile.id,
        label: report.profile.label,
        description: report.profile.description,
      },
      readinessScore: report.readinessScore,
      readinessGrade: report.readinessGrade,
      riskLevel: report.riskLevel,
      canShareReportSafely: report.canShareReportSafely,
      categoryCounts: report.categoryCounts,
      severityCounts: report.severityCounts,
      categoryScores: report.categoryScores,
      resourceCounts: report.resourceCounts,
      resourceSummary: report.resourceSummary,
      positiveChecks: report.positiveChecks,
      scoreBreakdown: report.scoreBreakdown,
      analysisMetadata: report.analysisMetadata,
      privacy: report.privacy,
      parseResult: sanitizeParseResult(report, rawInput),
      findings: report.findings.map(sanitizeFinding),
      fixFirstFindings: report.fixFirstFindings.map(sanitizeFinding),
      relationshipGraph: sanitizeRelationshipGraph(report.relationshipGraph),
      ...(rawInput ? { rawInput } : {}),
    },
  };

  return redactSensitiveOutput
    ? (redactK8sValueForDisplay(exportObject) as typeof exportObject)
    : exportObject;
}

export function buildK8sCsvFindingsExport(
  report: K8sAnalysisReport,
  options: K8sReportExportOptions = {},
) {
  const redactSensitiveOutput = options.redactSensitiveOutput !== false;
  const rows = [
    ["severity", "category", "resource", "title", "recommendation"],
    ...report.findings.map((finding) => [
      finding.severity,
      finding.category,
      formatFindingResource(finding),
      finding.title,
      finding.recommendation,
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");

  return redactSensitiveOutput ? String(redactK8sValueForDisplay(csv)) : csv;
}

export function buildSafeFixBundle(findings: readonly K8sFinding[]) {
  return buildSafeCopyFixBundle(findings);
}

export function buildResourceSummaryCopy(
  rows: ReadonlyArray<{
    namespaceLabel: string;
    kind: string;
    name: string;
    relationships: readonly string[];
    findingCount: number;
    issueCount: number;
  }>,
) {
  if (rows.length === 0) {
    return "No resources were available in this report.";
  }

  return [
    "| Namespace | Kind | Name | Relationships | Findings | Broken relationships |",
    "| --- | --- | --- | --- | ---: | ---: |",
    ...rows
      .map((row) =>
        [
          row.namespaceLabel,
          row.kind,
          row.name,
          row.relationships.length > 0 ? row.relationships.join("; ") : "None",
          String(row.findingCount),
          String(row.issueCount),
        ]
          .map((value) => value.replaceAll("|", "\\|"))
          .join(" | "),
      )
      .map((row) => `| ${row} |`),
  ].join("\n");
}

export function buildK8sMarkdownExport(
  report: K8sAnalysisReport,
  options: K8sReportExportOptions = {},
) {
  return buildK8sMarkdownReport(report, options);
}

export function buildK8sHtmlExport(
  report: K8sAnalysisReport,
  options: K8sReportExportOptions = {},
) {
  return buildK8sHtmlReport(report, options);
}

export function buildK8sExportBaseName(
  report: K8sAnalysisReport,
  options: K8sReportExportOptions = {},
) {
  const stamp = toExportTimestamp(options.generatedAt)
    .replaceAll(" UTC", "")
    .replaceAll(":", "-")
    .replaceAll(" ", "_");

  return ["k8s-review", report.profile.id, report.readinessScore, stamp].join(
    "-",
  );
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
) {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function sanitizeParseResult(
  report: K8sAnalysisReport,
  rawInput: string | undefined,
) {
  return {
    ok: report.parseResult.ok,
    errorCount: report.parseResult.errors.length,
    warningCount: report.parseResult.warnings.length,
    errors: report.parseResult.errors.map(sanitizeParseIssue),
    warnings: report.parseResult.warnings.map(sanitizeParseIssue),
    documents: report.parseResult.documents.map((document) => ({
      index: document.index,
      apiVersion: document.apiVersion,
      kind: document.kind,
      objectRef: document.objectRef,
      metadata: {
        name: document.metadata.name,
        namespace: document.metadata.namespace,
      },
      location: document.location,
    })),
    emptyDocuments: report.parseResult.emptyDocuments,
    input: {
      sizeBytes: report.parseResult.input.sizeBytes,
      recommendedMaxBytes: report.parseResult.input.recommendedMaxBytes,
      emptyDocumentCount: report.parseResult.input.emptyDocumentCount,
      documentCount: report.parseResult.input.documentCount,
      ...(rawInput ? { raw: rawInput } : {}),
    },
  };
}

function sanitizeParseIssue(issue: K8sParseError) {
  return {
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    detail: issue.detail,
    documentIndex: issue.documentIndex,
    path: issue.path,
    location: issue.location,
  };
}

function sanitizeFinding(finding: K8sFinding) {
  return {
    id: finding.id,
    ruleId: finding.ruleId,
    title: finding.title,
    message: finding.message,
    severity: finding.severity,
    category: finding.category,
    resourceRef: finding.resourceRef,
    location: finding.location,
    whyItMatters: finding.whyItMatters,
    recommendation: finding.recommendation,
    docsUrl: finding.docsUrl,
    confidence: finding.confidence,
    fix: sanitizeFix(finding.fix),
  };
}

function sanitizeFix(fix: K8sFixSuggestion | undefined) {
  if (!fix) {
    return undefined;
  }

  return {
    type: fix.type,
    title: fix.title,
    riskNote: fix.riskNote,
    safeToAutoApply: fix.safeToAutoApply,
    summary: fix.summary,
    yamlPath: fix.yamlPath,
    copyableContent: fix.copyableContent,
    ...(fix.type === "manual-instruction"
      ? { instructions: fix.instructions }
      : {}),
    ...(fix.type === "strategic-merge-patch-like" ||
    fix.type === "json-patch-like"
      ? { targetRef: fix.targetRef }
      : {}),
    ...(fix.type === "json-patch-like" ? { operations: fix.operations } : {}),
    ...(fix.type === "new-resource" ? { resourceKind: fix.resourceKind } : {}),
  };
}

function sanitizeRelationshipGraph(graph: K8sRelationshipGraph) {
  return {
    namespaces: graph.namespaces,
    resources: graph.resources.map((resource) => ({
      id: resource.id,
      kind: resource.kind,
      apiVersion: resource.apiVersion,
      name: resource.name,
      namespace: resource.namespace,
      scope: resource.scope,
      category: resource.category,
      documentIndex: resource.documentIndex,
      ref: resource.ref,
    })),
    relationships: graph.relationships,
    issues: graph.issues,
  };
}

function getPrivacyWarning(report: K8sAnalysisReport) {
  return report.privacy.sensitiveDataDetected
    ? report.privacy.warningText
    : null;
}

function formatFindingResource(finding: K8sFinding) {
  const { kind, name, namespace, documentIndex } = finding.resourceRef;

  if (kind && name) {
    return namespace ? `${kind}/${name} (${namespace})` : `${kind}/${name}`;
  }

  if (kind) {
    return namespace ? `${kind} (${namespace})` : kind;
  }

  return documentIndex >= 0
    ? `Document ${documentIndex + 1}`
    : "Manifest input";
}

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function toExportTimestamp(value: string | Date | undefined) {
  const date =
    value instanceof Date ? value : value ? new Date(value) : new Date();

  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}
