import { findingSeverities } from "@/lib/k8s/findings";
import type {
  K8sAnalysisReport,
  K8sFinding,
  K8sFindingSeverity,
} from "@/lib/k8s/types";
import { formatDurationMs } from "@/lib/k8s/analyzer-runtime";
import { redactSensitiveText } from "@/lib/privacy/redaction";

export type K8sMarkdownReportOptions = {
  generatedAt?: string | Date;
  maxFindings?: number;
  redactSensitiveOutput?: boolean;
};

export function buildK8sMarkdownReport(
  report: K8sAnalysisReport,
  options: K8sMarkdownReportOptions = {},
) {
  const generatedAt = formatExportTimestamp(options.generatedAt);
  const maxFindings = options.maxFindings ?? 20;
  const visibleFindings = report.findings.slice(0, maxFindings);
  const hiddenFindings = Math.max(
    report.findings.length - visibleFindings.length,
    0,
  );

  const lines = [
    "# Kubernetes Manifest Review",
    "",
    `Generated locally in browser on ${generatedAt}.`,
    "Static manifest review only. This is not a live cluster audit.",
    "",
    "## Summary",
    "",
    `- Score: ${report.readinessScore}/100`,
    `- Grade: ${report.readinessGrade}`,
    `- Risk level: ${capitalize(report.riskLevel)}`,
    `- Kubernetes target: ${report.options.kubernetesTargetVersion ?? "Not set"}`,
    `- Profile: ${report.profile.label}`,
    `- Objects analyzed: ${report.resourceSummary.totalObjects}`,
    `- Analysis time: ${formatDurationMs(report.analysisMetadata.totalMs)}`,
    `- Findings: ${report.findings.length}`,
    `- Generated timestamp: ${generatedAt}`,
    "",
    `> ${report.headline}`,
    "",
    report.summary,
    "",
    "## Severity Counts",
    "",
    buildSeverityTable(report.severityCounts),
    "",
    "## Fix First",
    "",
    ...(report.fixFirstFindings.length > 0
      ? report.fixFirstFindings
          .slice(0, 3)
          .map(
            (finding, index) =>
              `${index + 1}. **${finding.title}** on \`${formatResourceLabel(finding)}\``,
          )
      : ["- No must-fix issues were selected for this report."]),
    "",
    "## Top Findings",
    "",
    `Showing ${visibleFindings.length} of ${report.findings.length} findings.`,
    ...(hiddenFindings > 0
      ? [
          `${hiddenFindings} lower-severity finding${hiddenFindings === 1 ? "" : "s"} hidden to keep this PR summary concise.`,
        ]
      : []),
    "",
    ...(visibleFindings.length > 0
      ? visibleFindings.flatMap((finding, index) =>
          buildFindingSection(finding, index + 1),
        )
      : ["No findings were produced for this manifest set.", ""]),
    "## Review Notes",
    "",
    `- Next step: ${report.nextSteps}`,
    `- Share safety: ${report.canShareReportSafely ? "No secret-like values were detected in findings." : "Secret-like data was detected. Raw manifest content and secret values are intentionally omitted from this export."}`,
    "",
  ];

  if (!report.canShareReportSafely) {
    lines.splice(
      6,
      0,
      "> Privacy warning: secret-like data was detected in the input. This export omits raw manifest content and secret values by default.",
      "",
    );
  }

  const markdown = lines.join("\n");

  return options.redactSensitiveOutput === false
    ? markdown
    : redactSensitiveText(markdown);
}

function buildFindingSection(finding: K8sFinding, index: number) {
  return [
    `${index}. **[${finding.severity.toUpperCase()}] ${finding.title}**`,
    `   - Resource: \`${formatResourceLabel(finding)}\``,
    `   - Category: ${finding.category}`,
    `   - Finding: ${finding.message}`,
    `   - Recommendation: ${finding.recommendation}`,
    ...(finding.fix ? [`   - Suggested fix: ${finding.fix.title}`] : []),
    "",
  ];
}

function buildSeverityTable(
  severityCounts: Record<K8sFindingSeverity, number>,
) {
  const headers = findingSeverities.map((severity) => capitalize(severity));
  const values = findingSeverities.map((severity) =>
    String(severityCounts[severity]),
  );

  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    `| ${values.join(" | ")} |`,
  ].join("\n");
}

function formatResourceLabel(finding: K8sFinding) {
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

function formatExportTimestamp(value: string | Date | undefined) {
  const date =
    value instanceof Date ? value : value ? new Date(value) : new Date();

  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
