import { SeverityBadge } from "@/components/tool/severity-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type GenericFinding = {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  meta?: string;
  recommendation?: string;
};

type GenericToolFindingsProps = {
  findings: GenericFinding[];
  emptyMessage?: string | undefined;
};

export function GenericToolFindings({
  findings,
  emptyMessage = "No findings for the current input.",
}: GenericToolFindingsProps) {
  if (findings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
          <CardDescription>{emptyMessage}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="grid gap-4" aria-label="Findings">
      {findings.map((finding) => (
        <Card key={finding.id}>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={finding.severity} />
              {finding.meta ? (
                <span className="text-muted font-mono text-xs">{finding.meta}</span>
              ) : null}
            </div>
            <CardTitle className="text-lg">{finding.title}</CardTitle>
            <CardDescription>{finding.message}</CardDescription>
          </CardHeader>
          {finding.recommendation ? (
            <CardContent>
              <p className="text-sm leading-6">
                <span className="font-medium">Recommendation:</span>{" "}
                {finding.recommendation}
              </p>
            </CardContent>
          ) : null}
        </Card>
      ))}
    </section>
  );
}
