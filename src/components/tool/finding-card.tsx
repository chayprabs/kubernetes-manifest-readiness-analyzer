import type { K8sFinding, K8sFixSuggestionType } from "@/lib/k8s/types";
import { CopyButton } from "@/components/tool/copy-button";
import { SeverityBadge } from "@/components/tool/severity-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type FindingCardProps = {
  finding: K8sFinding;
  compact?: boolean;
};

export function FindingCard({ finding, compact = false }: FindingCardProps) {
  const fixCopyValue = finding.fix
    ? [
        `Title: ${finding.title}`,
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
        .join("\n\n")
    : undefined;
  const copyValue = [
    `Title: ${finding.title}`,
    `Severity: ${finding.severity}`,
    `Finding: ${finding.message}`,
    `Recommendation: ${finding.recommendation}`,
    fixCopyValue,
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
            {finding.fix ? (
              <div className="bg-background-muted/60 mt-5 space-y-4 rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                      Suggested fix
                    </p>
                    <p className="text-foreground text-sm font-medium">
                      {finding.fix.title}
                    </p>
                    <p className="text-muted text-sm leading-6">
                      {finding.fix.riskNote}
                    </p>
                  </div>
                  {fixCopyValue ? <CopyButton value={fixCopyValue} /> : null}
                </div>
                <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                  {getFixTypeLabel(finding.fix.type)}
                </p>
                {finding.fix.type === "manual-instruction" ? (
                  <p className="text-foreground text-sm leading-6">
                    {finding.fix.instructions}
                  </p>
                ) : null}
                {finding.fix.preview ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {finding.fix.preview.before ? (
                      <div className="space-y-2">
                        <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                          Before
                        </p>
                        <pre className="overflow-x-auto rounded-2xl bg-[#0b1324] p-4 text-sm leading-7 whitespace-pre-wrap text-slate-100">
                          {finding.fix.preview.before}
                        </pre>
                      </div>
                    ) : null}
                    {finding.fix.preview.after ? (
                      <div className="space-y-2">
                        <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                          After
                        </p>
                        <pre className="overflow-x-auto rounded-2xl bg-[#0b1324] p-4 text-sm leading-7 whitespace-pre-wrap text-slate-100">
                          {finding.fix.preview.after}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {finding.fix.copyableContent ? (
                  <div className="space-y-2">
                    <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                      Copyable content
                    </p>
                    <pre className="overflow-x-auto rounded-2xl bg-[#0b1324] p-4 text-sm leading-7 whitespace-pre-wrap text-slate-100">
                      {finding.fix.copyableContent}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </>
      )}
    </Card>
  );
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
