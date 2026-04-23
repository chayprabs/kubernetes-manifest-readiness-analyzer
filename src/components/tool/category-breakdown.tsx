import { findingCategories } from "@/lib/k8s/findings";
import type {
  K8sAnalysisReport,
  K8sFindingSeverity,
  K8sScorecardCategory,
} from "@/lib/k8s/types";
import { formatK8sCategoryLabel } from "@/components/tool/k8s-dashboard-helpers";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type CategoryBreakdownProps = {
  categorySummaries: K8sAnalysisReport["categorySummaries"];
  categoryScores: K8sAnalysisReport["categoryScores"];
};

const severityOrder: readonly K8sFindingSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export function CategoryBreakdown({
  categorySummaries,
  categoryScores,
}: CategoryBreakdownProps) {
  const visibleCategories = findingCategories.filter((category) => {
    const hasSummary = (categorySummaries[category]?.total ?? 0) > 0;
    const hasScore = category in categoryScores;
    return hasSummary || hasScore;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category breakdown</CardTitle>
        <CardDescription>
          Review where the score moved and which domains need the most attention.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {visibleCategories.map((category) => {
          const summary = categorySummaries[category];
          const score =
            category in categoryScores
              ? categoryScores[category as K8sScorecardCategory]
              : undefined;
          const severitySummary = severityOrder
            .filter((severity) => summary.bySeverity[severity] > 0)
            .map((severity) => `${summary.bySeverity[severity]} ${severity}`);

          return (
            <div
              key={category}
              className="border-border bg-background-muted/25 grid gap-3 rounded-2xl border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-semibold">
                    {formatK8sCategoryLabel(category)}
                  </p>
                  <p className="text-muted text-sm leading-6">
                    {summary.total === 0
                      ? "No findings in this category for the current report."
                      : `${summary.total} finding${summary.total === 1 ? "" : "s"} in this category.`}
                  </p>
                </div>
                {score !== undefined ? (
                  <Badge variant={score >= 85 ? "success" : score >= 65 ? "warning" : "destructive"}>
                    Score {score}/100
                  </Badge>
                ) : (
                  <Badge variant="secondary">No score impact</Badge>
                )}
              </div>

              {score !== undefined ? <Progress value={score} /> : null}

              <div className="flex flex-wrap gap-2">
                {severitySummary.length > 0 ? (
                  severitySummary.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary">No deductions</Badge>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
