import { downloadTextFile } from "@/lib/k8s/report-export";
import type { NetpolAnalysisReport } from "@/lib/netpol-review/types";

export function buildNetpolMarkdownExport(report: NetpolAnalysisReport) {
  const lines = [
    "# NetworkPolicy Review",
    "",
    report.summary,
    "",
    "## Findings",
    "",
  ];

  if (report.findings.length === 0) {
    lines.push("No findings.");
  } else {
    for (const finding of report.findings) {
      lines.push(
        `### ${finding.title}`,
        "",
        `- Severity: ${finding.severity}`,
        `- Resource: ${finding.resourceLabel}`,
        `- ${finding.message}`,
        `- Recommendation: ${finding.recommendation}`,
        "",
      );
    }
  }

  return lines.join("\n");
}

export function buildNetpolJsonExport(report: NetpolAnalysisReport) {
  return JSON.stringify({ report }, null, 2);
}

export function downloadNetpolTextFile(
  filename: string,
  contents: string,
  mimeType: string,
) {
  downloadTextFile(filename, contents, mimeType);
}
