import { ExternalLink } from "lucide-react";
import type { K8sFinding, K8sFixSuggestionType } from "@/lib/k8s/types";
import {
  formatK8sCategoryLabel,
  formatK8sConfidenceLabel,
  formatK8sResourceLabel,
  getConfidenceBadgeVariant,
} from "@/components/tool/k8s-dashboard-helpers";
import { CopyButton } from "@/components/tool/copy-button";
import { SeverityBadge } from "@/components/tool/severity-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type FindingCardProps = {
  finding: K8sFinding;
  compact?: boolean;
};

export function FindingCard({ finding, compact = false }: FindingCardProps) {
  const fixCopyValue = finding.fix ? buildFixCopyValue(finding) : undefined;
  const copyValue = [
    `Title: ${finding.title}`,
    `Severity: ${finding.severity}`,
    `Category: ${finding.category}`,
    `Resource: ${formatK8sResourceLabel(finding.resourceRef)}`,
    `Finding: ${finding.message}`,
    `Why it matters: ${finding.whyItMatters}`,
    `Recommendation: ${finding.recommendation}`,
    fixCopyValue,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={finding.severity} />
              <Badge variant="secondary">
                {formatK8sCategoryLabel(finding.category)}
              </Badge>
              <Badge variant={getConfidenceBadgeVariant(finding.confidence)}>
                {formatK8sConfidenceLabel(finding.confidence)}
              </Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-base sm:text-lg">
                {finding.title}
              </CardTitle>
              <p className="text-muted text-sm">
                {formatK8sResourceLabel(finding.resourceRef)}
              </p>
            </div>
          </div>

          <CopyButton value={copyValue} />
        </div>

        <p className="text-muted text-sm leading-6">{finding.message}</p>
      </CardHeader>

      <Separator />

      <CardContent className="grid gap-4 pt-4">
        <DetailBlock label="Why it matters" text={finding.whyItMatters} />
        <DetailBlock label="Recommendation" text={finding.recommendation} />

        {finding.fix ? (
          <div className="border-border bg-background-muted/55 grid gap-4 rounded-2xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-foreground text-sm font-semibold">
                    {finding.fix.title}
                  </p>
                  <Badge
                    variant={
                      finding.fix.safeToAutoApply ? "success" : "warning"
                    }
                  >
                    {finding.fix.safeToAutoApply
                      ? "Suggestion is low risk"
                      : "Needs human review"}
                  </Badge>
                </div>
                <p className="text-muted text-sm leading-6">
                  {finding.fix.summary}
                </p>
                <p className="text-muted text-sm leading-6">
                  {finding.fix.riskNote}
                </p>
              </div>
              {fixCopyValue ? <CopyButton value={fixCopyValue} /> : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {getFixTypeLabel(finding.fix.type)}
              </Badge>
              {finding.fix.yamlPath ? (
                <Badge variant="outline">Path {finding.fix.yamlPath}</Badge>
              ) : null}
            </div>

            {finding.fix.type === "manual-instruction" ? (
              <p className="text-foreground text-sm leading-6">
                {finding.fix.instructions}
              </p>
            ) : null}

            {!compact && finding.fix.preview ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {finding.fix.preview.before ? (
                  <PreviewBlock label="Before" value={finding.fix.preview.before} />
                ) : null}
                {finding.fix.preview.after ? (
                  <PreviewBlock label="After" value={finding.fix.preview.after} />
                ) : null}
              </div>
            ) : null}

            {finding.fix.copyableContent ? (
              <PreviewBlock
                label="Copyable content"
                value={finding.fix.copyableContent}
              />
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {finding.location?.path ? (
            <Badge variant="outline">Path {finding.location.path}</Badge>
          ) : null}
          {finding.location?.source ? (
            <Badge variant="outline">
              Line {finding.location.source.line}
            </Badge>
          ) : null}
          {finding.docsUrl ? (
            <Button asChild type="button" size="sm" variant="outline">
              <a href={finding.docsUrl} rel="noreferrer" target="_blank">
                Open docs
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-2">
      <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
        {label}
      </p>
      <p className="text-foreground text-sm leading-6">{text}</p>
    </div>
  );
}

function PreviewBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
        {label}
      </p>
      <pre className="overflow-x-auto rounded-2xl bg-[#0b1324] p-4 text-sm leading-7 whitespace-pre-wrap text-slate-100">
        {value}
      </pre>
    </div>
  );
}

function buildFixCopyValue(finding: K8sFinding) {
  if (!finding.fix) {
    return undefined;
  }

  return [
    `Finding: ${finding.title}`,
    `Resource: ${formatK8sResourceLabel(finding.resourceRef)}`,
    `Fix: ${finding.fix.title}`,
    `Fix type: ${getFixTypeLabel(finding.fix.type)}`,
    `Risk note: ${finding.fix.riskNote}`,
    finding.fix.type === "manual-instruction"
      ? `Manual guidance: ${finding.fix.instructions}`
      : undefined,
    finding.fix.copyableContent
      ? `Copyable content:\n${finding.fix.copyableContent}`
      : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

function getFixTypeLabel(type: K8sFixSuggestionType) {
  switch (type) {
    case "yaml-snippet":
      return "YAML snippet";
    case "strategic-merge-patch-like":
      return "Strategic merge patch";
    case "json-patch-like":
      return "JSON patch";
    case "manual-instruction":
      return "Manual guidance";
    case "new-resource":
      return "New resource";
    default:
      return "Suggested fix";
  }
}
