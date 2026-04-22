import type { K8sFinding } from "@/lib/k8s/types";
import { CopyButton } from "@/components/tool/copy-button";
import { SeverityBadge } from "@/components/tool/severity-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type FindingCardProps = {
  finding: K8sFinding;
  compact?: boolean;
};

export function FindingCard({ finding, compact = false }: FindingCardProps) {
  const copyValue = [
    `Title: ${finding.title}`,
    `Severity: ${finding.severity}`,
    `Finding: ${finding.message}`,
    `Recommendation: ${finding.recommendation}`,
  ].join("\n");

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <SeverityBadge severity={finding.severity} />
            <CardTitle className="text-base">{finding.title}</CardTitle>
          </div>
          <CopyButton value={copyValue} />
        </div>
        <p className="text-muted text-sm leading-6">{finding.message}</p>
      </CardHeader>
      {compact ? null : (
        <>
          <Separator />
          <CardContent className="pt-4">
            <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
              Recommended action
            </p>
            <p className="text-foreground mt-2 text-sm leading-6">
              {finding.recommendation}
            </p>
          </CardContent>
        </>
      )}
    </Card>
  );
}
