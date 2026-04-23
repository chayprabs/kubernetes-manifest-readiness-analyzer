import { ExternalLink } from "lucide-react";
import type { K8sFinding } from "@/lib/k8s/types";
import { buildFixCopyValue } from "@/lib/k8s/fix-checklist";
import {
  formatK8sCategoryLabel,
  formatK8sConfidenceLabel,
  formatK8sResourceLabel,
  getConfidenceBadgeVariant,
} from "@/components/tool/k8s-dashboard-helpers";
import { CopyButton } from "@/components/tool/copy-button";
import { FixSuggestionCard } from "@/components/tool/fix-suggestion-card";
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

          <CopyButton
            value={copyValue}
            ariaLabel="Copy finding details"
            showInlineFeedback
          />
        </div>

        <p className="text-muted text-sm leading-6">{finding.message}</p>
      </CardHeader>

      <Separator />

      <CardContent className="grid gap-4 pt-4">
        <DetailBlock label="Why it matters" text={finding.whyItMatters} />
        <DetailBlock label="Recommendation" text={finding.recommendation} />

        {finding.fix ? (
          <FixSuggestionCard finding={finding} compact={compact} />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {finding.location?.path ? (
            <Badge variant="outline">Path {finding.location.path}</Badge>
          ) : null}
          {finding.location?.source ? (
            <Badge variant="outline">Line {finding.location.source.line}</Badge>
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
