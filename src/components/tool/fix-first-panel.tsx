import type { K8sFinding } from "@/lib/k8s/types";
import type { AnalyticsEventPayloadInput } from "@/lib/analytics/events";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { formatK8sResourceLabel } from "@/components/tool/k8s-dashboard-helpers";
import { CopyButton } from "@/components/tool/copy-button";
import { SeverityBadge } from "@/components/tool/severity-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FixFirstPanelProps = {
  findings: readonly K8sFinding[];
  title?: string;
  description?: string;
  analyticsPayload?: AnalyticsEventPayloadInput | undefined;
};

export function FixFirstPanel({
  findings,
  title = "Fix first",
  description = "Start with the most important issues from the current report before polishing lower-severity warnings.",
  analyticsPayload,
}: FixFirstPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {findings.length > 0 ? (
          findings.slice(0, 3).map((finding) => {
            const fixCopyValue = buildFixCopyValue(finding);

            return (
              <div
                key={finding.id}
                className="border-border bg-background-muted/35 grid gap-3 rounded-2xl border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <SeverityBadge severity={finding.severity} />
                    <div className="space-y-1">
                      <p className="text-foreground text-sm font-semibold">
                        {finding.title}
                      </p>
                      <p className="text-muted text-sm">
                        {formatK8sResourceLabel(finding.resourceRef)}
                      </p>
                    </div>
                  </div>
                  {fixCopyValue ? (
                    <CopyButton
                      value={fixCopyValue}
                      ariaLabel="Copy fix-first recommendation"
                      showInlineFeedback
                      onCopySuccess={() =>
                        trackAnalyticsEvent("fix_copied", analyticsPayload)
                      }
                    />
                  ) : null}
                </div>
                <p className="text-muted text-sm leading-6">
                  {finding.message}
                </p>
                <p className="text-foreground text-sm leading-6">
                  {finding.fix?.summary ?? finding.recommendation}
                </p>
              </div>
            );
          })
        ) : (
          <p className="text-muted text-sm leading-6">
            No must-fix issues were selected for this report.
          </p>
        )}
      </CardContent>
    </Card>
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
    finding.fix.type === "manual-instruction"
      ? finding.fix.instructions
      : finding.fix.copyableContent,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}
