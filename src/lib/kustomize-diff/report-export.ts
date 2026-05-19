import type { KustomizeDiffReport } from "@/lib/kustomize-diff/types";
import { downloadTextFile } from "@/lib/k8s/report-export";

export function buildKustomizeMarkdownExport(report: KustomizeDiffReport) {
  const sections = [
    "# Kustomize Output Diff",
    "",
    report.summary,
    "",
    "## Added",
    formatSection(report.added),
    "## Removed",
    formatSection(report.removed),
    "## Changed",
    formatSection(report.changed),
  ];

  return sections.join("\n");
}

export function buildKustomizeJsonExport(report: KustomizeDiffReport) {
  return JSON.stringify({ report }, null, 2);
}

export function downloadKustomizeTextFile(
  filename: string,
  contents: string,
  mimeType: string,
) {
  downloadTextFile(filename, contents, mimeType);
}

function formatSection(items: KustomizeDiffReport["added"]) {
  if (items.length === 0) {
    return "- None\n";
  }

  return items.map((item) => `- ${item.summary}`).join("\n") + "\n";
}
