import type { K8sAnalysisReport } from "@/lib/k8s/types";
import { buildK8sMarkdownReport, type K8sMarkdownReportOptions } from "@/lib/k8s/report-markdown";

export function buildK8sHtmlReport(
  report: K8sAnalysisReport,
  options: K8sMarkdownReportOptions = {},
) {
  const markdown = buildK8sMarkdownReport(report, options);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kubernetes Manifest Review</title>
    <style>
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f6f8fb;
        color: #0f172a;
      }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }
      .card {
        background: white;
        border: 1px solid #dbe2ea;
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        font-size: 14px;
        line-height: 1.7;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <pre>${escapeHtml(markdown)}</pre>
      </div>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
