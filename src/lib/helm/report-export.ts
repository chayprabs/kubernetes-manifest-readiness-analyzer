import { buildHelmMarkdownReport } from "@/lib/helm/report-markdown";

export { buildHelmMarkdownReport };
import { downloadTextFile as downloadK8sTextFile } from "@/lib/k8s/report-export";
import type { HelmAnalysisReport, HelmFinding } from "@/lib/helm/types";

export function buildHelmJsonExport(report: HelmAnalysisReport) {
  return JSON.stringify(
    {
      exportMetadata: {
        generatedLocallyInBrowser: true,
        reviewType: "helm-values-review",
      },
      report,
    },
    null,
    2,
  );
}

export function buildHelmCsvExport(report: HelmAnalysisReport) {
  const rows = [
    ["severity", "ruleId", "path", "title", "recommendation"],
    ...report.findings.map((finding) => [
      finding.severity,
      finding.ruleId,
      finding.path,
      finding.title,
      finding.recommendation,
    ]),
  ];

  return rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export function buildHelmHtmlExport(report: HelmAnalysisReport) {
  const markdown = buildHelmMarkdownReport(report);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Helm Values Review</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; color: #0f172a; }
      pre { white-space: pre-wrap; line-height: 1.6; }
    </style>
  </head>
  <body>
    <pre>${escapeHtml(markdown)}</pre>
  </body>
</html>`;
}

export function buildHelmExportBaseName(report: HelmAnalysisReport) {
  return ["helm-values-review", report.profile, report.findings.length].join("-");
}

export function downloadHelmTextFile(
  filename: string,
  contents: string,
  mimeType: string,
) {
  downloadK8sTextFile(filename, contents, mimeType);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export type { HelmFinding };
