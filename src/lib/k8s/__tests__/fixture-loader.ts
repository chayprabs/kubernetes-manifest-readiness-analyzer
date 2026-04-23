import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  K8sAnalysisReport,
  K8sFixSuggestion,
  K8sObjectRef,
  K8sParseError,
  K8sRelationshipIssue,
} from "@/lib/k8s/types";

export const k8sFixtureNames = [
  "clean-production-deployment.yaml",
  "missing-probes-resources.yaml",
  "service-selector-mismatch.yaml",
  "insecure-security-context.yaml",
  "public-loadbalancer-ingress-no-tls.yaml",
  "deprecated-apis.yaml",
  "cronjob-risk.yaml",
  "pdb-mismatch.yaml",
  "multi-namespace-bundle.yaml",
  "invalid-yaml.yaml",
  "secret-redaction.yaml",
] as const;

export type K8sFixtureName = (typeof k8sFixtureNames)[number];

export const fixedGeneratedAt = "2026-04-23T02:30:00.000Z";

const fixturesDirectory = fileURLToPath(
  new URL("../__fixtures__/", import.meta.url),
);

export function loadK8sFixture(name: K8sFixtureName) {
  return readFileSync(getK8sFixturePath(name), "utf8").trimEnd();
}

export function getK8sFixturePath(name: K8sFixtureName) {
  return path.join(fixturesDirectory, name);
}

export function normalizeMarkdownSnapshot(markdown: string) {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/- Analysis time: .+/u, "- Analysis time: <timing>");
}

export function buildGoldenReportSnapshot(report: K8sAnalysisReport) {
  return {
    ok: report.ok,
    state: report.state,
    message: report.message,
    headline: report.headline,
    summary: report.summary,
    nextSteps: report.nextSteps,
    options: report.options,
    profile: report.profile.id,
    readinessScore: report.readinessScore,
    readinessGrade: report.readinessGrade,
    riskLevel: report.riskLevel,
    canShareReportSafely: report.canShareReportSafely,
    categoryCounts: report.categoryCounts,
    severityCounts: report.severityCounts,
    categoryScores: report.categoryScores,
    resourceCounts: report.resourceCounts,
    resourceSummary: report.resourceSummary,
    analysisMetadata: {
      ...report.analysisMetadata,
      parseMs: "<timing>",
      analyzeMs: "<timing>",
      totalMs: "<timing>",
    },
    positiveChecks: report.positiveChecks,
    parseIssues: [
      ...report.parseResult.errors,
      ...report.parseResult.warnings,
    ].map(compactParseIssue),
    relationshipIssues: report.relationshipGraph.issues.map(
      compactRelationshipIssue,
    ),
    privacy: {
      sensitiveDataDetected: report.privacy.sensitiveDataDetected,
      signalCount: report.privacy.signalCount,
      detectedKinds: report.privacy.detectedKinds,
      warningTitle: report.privacy.warningTitle,
      warningText: report.privacy.warningText,
      signals: report.privacy.signals.map((signal) => ({
        kind: signal.kind,
        fieldPath: signal.fieldPath,
        documentIndex: signal.documentIndex,
        resource: formatObjectRef(signal.resourceRef),
        ...(signal.keyName ? { keyName: signal.keyName } : {}),
      })),
    },
    fixFirstFindings: report.fixFirstFindings.map(compactFinding),
    findings: report.findings.map(compactFinding),
  };
}

function compactParseIssue(issue: K8sParseError) {
  return {
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    ...(issue.detail ? { detail: issue.detail } : {}),
    ...(issue.documentIndex !== undefined
      ? { documentIndex: issue.documentIndex }
      : {}),
    ...(issue.path ? { path: issue.path } : {}),
    ...(issue.location
      ? {
          location: {
            line: issue.location.line,
            column: issue.location.column,
            endLine: issue.location.endLine,
            endColumn: issue.location.endColumn,
          },
        }
      : {}),
  };
}

function compactRelationshipIssue(issue: K8sRelationshipIssue) {
  return {
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    source: formatObjectRef(issue.sourceRef),
    ...(issue.targetRef ? { target: formatObjectRef(issue.targetRef) } : {}),
  };
}

function compactFinding(finding: K8sAnalysisReport["findings"][number]) {
  return {
    ruleId: finding.ruleId,
    severity: finding.severity,
    category: finding.category,
    confidence: finding.confidence,
    title: finding.title,
    resource: formatObjectRef(finding.resourceRef),
    message: finding.message,
    recommendation: finding.recommendation,
    ...(finding.location?.path ? { yamlPath: finding.location.path } : {}),
    ...(finding.fix ? { fix: compactFix(finding.fix) } : {}),
  };
}

function compactFix(fix: K8sFixSuggestion) {
  return {
    type: fix.type,
    title: fix.title,
    safeToAutoApply: fix.safeToAutoApply,
    ...(fix.yamlPath ? { yamlPath: fix.yamlPath } : {}),
    ...(fix.preview ? { preview: fix.preview } : {}),
    ...(fix.type === "manual-instruction"
      ? { instructions: fix.instructions }
      : {}),
    ...(fix.copyableContent
      ? { copyableContentPreview: previewMultiline(fix.copyableContent) }
      : {}),
  };
}

function formatObjectRef(ref: K8sObjectRef) {
  if (ref.kind && ref.name) {
    return ref.namespace
      ? `${ref.kind}/${ref.name} (${ref.namespace})`
      : `${ref.kind}/${ref.name}`;
  }

  if (ref.kind) {
    return ref.namespace ? `${ref.kind} (${ref.namespace})` : ref.kind;
  }

  return ref.documentIndex >= 0
    ? `Document ${ref.documentIndex + 1}`
    : "Manifest input";
}

function previewMultiline(value: string, maxLines = 8) {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  return lines.slice(0, maxLines).join("\n");
}
