"use client";

import { useEffect, useMemo, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { getAnalyticsBrowserLocale } from "@/lib/analytics/events";
import {
  analyzeNetworkPolicies,
  networkPolicyReviewerToolId,
} from "@/lib/netpol-review/analyzer";
import {
  buildNetpolJsonExport,
  buildNetpolMarkdownExport,
  downloadNetpolTextFile,
} from "@/lib/netpol-review/report-export";
import type { NetpolAnalysisReport } from "@/lib/netpol-review/types";
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
import { Textarea } from "@/components/ui/textarea";

const permissiveSample = `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all-egress
  namespace: apps
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - {}
`;

export function NetpolReviewApp({ embedded = false }: { embedded?: boolean }) {
  const [input, setInput] = useState("");
  const [report, setReport] = useState<NetpolAnalysisReport | null>(null);

  useEffect(() => {
    trackAnalyticsEvent("tool_viewed", {
      toolId: networkPolicyReviewerToolId,
      browserLocale: getAnalyticsBrowserLocale(),
    });
  }, []);

  const findings = useMemo(
    () =>
      report?.findings.map((finding) => ({
        id: finding.id,
        title: finding.title,
        message: finding.message,
        severity: finding.severity,
        meta: finding.resourceLabel,
        recommendation: finding.recommendation,
      })) ?? [],
    [report],
  );

  function runAnalysis(nextInput = input) {
    trackAnalyticsEvent("analysis_started", {
      toolId: networkPolicyReviewerToolId,
      browserLocale: getAnalyticsBrowserLocale(),
    });
    const nextReport = analyzeNetworkPolicies(nextInput);
    setReport(nextReport);
    trackAnalyticsEvent("analysis_completed", {
      toolId: networkPolicyReviewerToolId,
      browserLocale: getAnalyticsBrowserLocale(),
    });
  }

  const parseFailed = report !== null && !report.ok && report.findings.length === 0;

  return (
    <ToolWorkspaceShell
      embedded={embedded}
      title="NetworkPolicy Reviewer"
      description="Review NetworkPolicy YAML locally for risky allowlists, open egress, and missing default-deny posture before you apply traffic rules."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Policy bundle</CardTitle>
            <CardDescription>
              Paste NetworkPolicy manifests plus related workloads from the same
              namespace when possible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setInput(permissiveSample);
                runAnalysis(permissiveSample);
              }}
            >
              Load permissive sample
            </Button>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-[360px] font-mono text-sm"
              aria-label="NetworkPolicy YAML editor"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => runAnalysis()}>
                Review policies
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!report}
                onClick={() =>
                  report &&
                  downloadNetpolTextFile(
                    "networkpolicy-review.md",
                    buildNetpolMarkdownExport(report),
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
                  downloadNetpolTextFile(
                    "networkpolicy-review.json",
                    buildNetpolJsonExport(report),
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
          </CardContent>
        </Card>

        <GenericToolFindings
          findings={findings}
          emptyMessage={
            parseFailed
              ? (report?.summary ??
                "Fix YAML parse errors before reviewing policies.")
              : undefined
          }
        />
      </div>
    </ToolWorkspaceShell>
  );
}
