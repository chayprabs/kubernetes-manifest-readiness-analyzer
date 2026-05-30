"use client";

import { useEffect, useMemo, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { getAnalyticsBrowserLocale } from "@/lib/analytics/events";
import {
  analyzeHelmValues,
  helmValuesCheckerToolId,
} from "@/lib/helm/analyzer";
import { helmValuesExamples } from "@/lib/helm/examples";
import {
  buildHelmCsvExport,
  buildHelmHtmlExport,
  buildHelmJsonExport,
  buildHelmExportBaseName,
  buildHelmMarkdownReport,
} from "@/lib/helm/report-export";
import { ToolExportMenuBase } from "@/components/tool/tool-export-menu-base";
import type { HelmAnalysisReport, HelmProfileId } from "@/lib/helm/types";
import { GenericToolFindings } from "@/components/tool/generic-tool-findings";
import { ToolWorkspaceShell } from "@/components/tool/tool-workspace-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function HelmValuesApp() {
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<HelmProfileId>("balanced");
  const [report, setReport] = useState<HelmAnalysisReport | null>(null);

  useEffect(() => {
    trackAnalyticsEvent("tool_viewed", {
      toolId: helmValuesCheckerToolId,
      profile,
      browserLocale: getAnalyticsBrowserLocale(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  const findings = useMemo(
    () =>
      report?.findings.map((finding) => ({
        id: finding.id,
        title: finding.title,
        message: finding.message,
        severity: finding.severity,
        meta: finding.path,
        recommendation: finding.recommendation,
      })) ?? [],
    [report],
  );

  function runAnalysis(nextInput = input, nextProfile = profile) {
    trackAnalyticsEvent("analysis_started", {
      toolId: helmValuesCheckerToolId,
      profile: nextProfile,
      browserLocale: getAnalyticsBrowserLocale(),
    });
    const nextReport = analyzeHelmValues(nextInput, { profile: nextProfile });
    setReport(nextReport);
    trackAnalyticsEvent("analysis_completed", {
      toolId: helmValuesCheckerToolId,
      profile: nextProfile,
      browserLocale: getAnalyticsBrowserLocale(),
    });
  }

  const exportFormats = useMemo(() => {
    if (!report) {
      return [];
    }

    const baseName = buildHelmExportBaseName(report);

    return [
      {
        id: "copy-markdown",
        label: "Copy Markdown",
        kind: "copy" as const,
        buildContent: () => buildHelmMarkdownReport(report),
        mimeType: "text/markdown;charset=utf-8",
        fileName: `${baseName}.md`,
      },
      {
        id: "download-markdown",
        label: "Download Markdown",
        kind: "download" as const,
        buildContent: () => buildHelmMarkdownReport(report),
        mimeType: "text/markdown;charset=utf-8",
        fileName: `${baseName}.md`,
      },
      {
        id: "download-json",
        label: "Download JSON",
        kind: "download" as const,
        buildContent: () => buildHelmJsonExport(report),
        mimeType: "application/json;charset=utf-8",
        fileName: `${baseName}.json`,
      },
      {
        id: "download-csv",
        label: "Download CSV",
        kind: "download" as const,
        buildContent: () => buildHelmCsvExport(report),
        mimeType: "text/csv;charset=utf-8",
        fileName: `${baseName}.csv`,
      },
      {
        id: "download-html",
        label: "Download HTML",
        kind: "download" as const,
        buildContent: () => buildHelmHtmlExport(report),
        mimeType: "text/html;charset=utf-8",
        fileName: `${baseName}.html`,
      },
    ];
  }, [report]);

  return (
    <ToolWorkspaceShell
      title="Kubernetes Helm Values Checker"
      description="Review Helm values.yaml locally for risky image tags, missing resources, plaintext secrets, and insecure security context defaults before you render charts."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Values input</CardTitle>
            <CardDescription>
              Paste or edit values.yaml content. Analysis stays in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {helmValuesExamples.map((example) => (
                <Button
                  key={example.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInput(example.content);
                    runAnalysis(example.content);
                  }}
                >
                  {example.title}
                </Button>
              ))}
            </div>
            <Select
              value={profile}
              onValueChange={(value) => setProfile(value as HelmProfileId)}
            >
              <SelectTrigger aria-label="Helm review profile">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="strict">Strict production</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-[360px] font-mono text-sm"
              aria-label="Helm values editor"
              placeholder="image:\n  repository: ghcr.io/example/api\n  tag: latest"
            />
            <div className="flex flex-wrap items-start gap-2">
              <Button type="button" onClick={() => runAnalysis()}>
                Analyze values
              </Button>
              <ToolExportMenuBase
                disabled={!report}
                formats={exportFormats}
                onOpen={() =>
                  trackAnalyticsEvent("export_opened", {
                    toolId: helmValuesCheckerToolId,
                    profile,
                    browserLocale: getAnalyticsBrowserLocale(),
                  })
                }
                onAction={(_formatId, kind) =>
                  trackAnalyticsEvent(
                    kind === "copy" ? "report_copied" : "report_downloaded",
                    {
                      toolId: helmValuesCheckerToolId,
                      profile,
                      browserLocale: getAnalyticsBrowserLocale(),
                    },
                  )
                }
              />
            </div>
            {report ? (
              <p className="text-muted text-sm leading-6">{report.summary}</p>
            ) : null}
          </CardContent>
        </Card>

        <GenericToolFindings findings={findings} />
      </div>
    </ToolWorkspaceShell>
  );
}
