"use client";

import { useEffect, useMemo, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { getAnalyticsBrowserLocale } from "@/lib/analytics/events";
import { compareKustomizeOutputs } from "@/lib/kustomize-diff/differ";
import {
  buildKustomizeJsonExport,
  buildKustomizeMarkdownExport,
  downloadKustomizeTextFile,
} from "@/lib/kustomize-diff/report-export";
import type { KustomizeDiffReport } from "@/lib/kustomize-diff/types";
import { GenericToolFindings } from "@/components/tool/generic-tool-findings";
import { ToolWorkspaceShell } from "@/components/tool/tool-workspace-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const kustomizeDiffToolId = "kustomize-output-diff";

const leftSample = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: apps
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/example/api:1.0.0
`;

const rightSample = leftSample.replace("1.0.0", "1.1.0");

export function KustomizeDiffApp({ embedded = false }: { embedded?: boolean }) {
  const [leftInput, setLeftInput] = useState("");
  const [rightInput, setRightInput] = useState("");
  const [report, setReport] = useState<KustomizeDiffReport | null>(null);

  useEffect(() => {
    trackAnalyticsEvent("tool_viewed", {
      toolId: kustomizeDiffToolId,
      browserLocale: getAnalyticsBrowserLocale(),
    });
  }, []);

  const findings = useMemo(() => {
    if (!report) {
      return [];
    }

    return [...report.added, ...report.removed, ...report.changed].map(
      (item) => ({
        id: item.id,
        title: item.summary,
        message: `${item.changeType} ${item.kind}/${item.name} in ${item.namespace}`,
        severity:
          item.changeType === "removed"
            ? ("high" as const)
            : item.category === "exposure"
              ? ("high" as const)
              : ("medium" as const),
        meta: item.category,
        recommendation: "Review rendered overlay output before promotion.",
      }),
    );
  }, [report]);

  function runCompare(nextLeft = leftInput, nextRight = rightInput) {
    trackAnalyticsEvent("analysis_started", {
      toolId: kustomizeDiffToolId,
      browserLocale: getAnalyticsBrowserLocale(),
    });
    const nextReport = compareKustomizeOutputs(nextLeft, nextRight);
    setReport(nextReport);
    trackAnalyticsEvent("analysis_completed", {
      toolId: kustomizeDiffToolId,
      browserLocale: getAnalyticsBrowserLocale(),
    });
  }

  const parseFailed = report !== null && !report.ok && report.parseErrors.length > 0;

  return (
    <ToolWorkspaceShell
      embedded={embedded}
      title="Kustomize Output Diff Reviewer"
      description="Compare two rendered Kustomize manifest bundles locally. See added, removed, and changed resources before you promote an overlay."
    >
      <div className="grid gap-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Base overlay output</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={leftInput}
                onChange={(event) => setLeftInput(event.target.value)}
                className="min-h-[280px] font-mono text-sm"
                aria-label="Base overlay YAML"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Compare overlay output</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={rightInput}
                onChange={(event) => setRightInput(event.target.value)}
                className="min-h-[280px] font-mono text-sm"
                aria-label="Compare overlay YAML"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setLeftInput(leftSample);
              setRightInput(rightSample);
              runCompare(leftSample, rightSample);
            }}
          >
            Load sample diff
          </Button>
          <Button type="button" onClick={() => runCompare()}>
            Compare outputs
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!report}
            onClick={() =>
              report &&
              downloadKustomizeTextFile(
                "kustomize-diff.md",
                buildKustomizeMarkdownExport(report),
                "text/markdown;charset=utf-8",
              )
            }
          >
            Download Markdown
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!report}
            onClick={() =>
              report &&
              downloadKustomizeTextFile(
                "kustomize-diff.json",
                buildKustomizeJsonExport(report),
                "application/json;charset=utf-8",
              )
            }
          >
            Download JSON
          </Button>
        </div>

        {report ? (
          <p className="text-muted text-sm leading-6">{report.summary}</p>
        ) : null}

        <GenericToolFindings
          findings={findings}
          emptyMessage={
            parseFailed
              ? (report?.summary ?? "Fix YAML parse errors before comparing.")
              : "Run a comparison to review added, removed, and changed resources."
          }
        />
      </div>
    </ToolWorkspaceShell>
  );
}
