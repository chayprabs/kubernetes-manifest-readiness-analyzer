import type { HelmAnalysisReport } from "@/lib/helm/types";

export function buildHelmMarkdownReport(report: HelmAnalysisReport) {
  const lines = [
    "# Helm Values Review",
    "",
    "Generated locally in the browser. Static values review only.",
    "",
    "## Summary",
    "",
    `- Profile: ${report.profile}`,
    `- ${report.summary}`,
    `- Findings: ${report.findings.length}`,
    "",
  ];

  if (report.findings.length === 0) {
    lines.push("No findings for the selected profile.");
    return lines.join("\n");
  }

  lines.push("## Findings", "");

  for (const finding of report.findings) {
    lines.push(
      `### ${finding.title}`,
      "",
      `- Severity: ${finding.severity}`,
      `- Path: \`${finding.path}\``,
      `- ${finding.message}`,
      `- Recommendation: ${finding.recommendation}`,
      "",
    );
  }

  return lines.join("\n");
}
