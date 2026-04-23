import type { K8sAnalysisReport } from "@/lib/k8s/types";
import {
  getRiskBadgeVariant,
  formatK8sNamespaceLabel,
} from "@/components/tool/k8s-dashboard-helpers";
import { ScoreRing } from "@/components/tool/score-ring";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type K8sScoreSummaryProps = {
  report: K8sAnalysisReport;
  stale?: boolean;
};

export function K8sScoreSummary({
  report,
  stale = false,
}: K8sScoreSummaryProps) {
  return (
    <Card className="bg-background-muted/30 shadow-none">
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="flex justify-center">
          <ScoreRing score={report.readinessScore} />
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{report.readinessGrade}</Badge>
            <Badge variant={getRiskBadgeVariant(report.riskLevel)}>
              Risk {report.riskLevel}
            </Badge>
            <Badge variant="outline">{report.profile.label}</Badge>
            {stale ? <Badge variant="warning">Results need refresh</Badge> : null}
          </div>

          <div className="space-y-2">
            <h2 className="text-foreground text-2xl font-semibold sm:text-3xl">
              {report.headline}
            </h2>
            <p className="text-muted text-sm leading-7 sm:text-base">
              {report.summary}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryStat
              label="Objects"
              value={String(report.resourceSummary.totalObjects)}
            />
            <SummaryStat
              label="Namespaces"
              value={
                report.resourceSummary.namespacesFound.length > 0
                  ? report.resourceSummary.namespacesFound
                      .map((namespace) => formatK8sNamespaceLabel(namespace))
                      .join(", ")
                  : "Cluster-scoped"
              }
            />
            <SummaryStat
              label="Workloads"
              value={String(report.resourceSummary.workloadsFound)}
            />
            <SummaryStat
              label="Services"
              value={String(report.resourceSummary.servicesFound)}
            />
          </div>

          <div className="border-border bg-card rounded-2xl border p-4">
            <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
              Next step
            </p>
            <p className="text-foreground mt-2 text-sm leading-6">
              {report.nextSteps}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
        {label}
      </p>
      <p className="text-foreground mt-2 text-sm font-medium break-words">
        {value}
      </p>
    </div>
  );
}
