import type { K8sFindingSeverity } from "@/lib/k8s/types";
import { Card, CardContent } from "@/components/ui/card";

type SeveritySummaryCardsProps = {
  severityCounts: Record<K8sFindingSeverity, number>;
};

const severityCardConfig: ReadonlyArray<{
  severity: K8sFindingSeverity;
  label: string;
  description: string;
  className: string;
}> = [
  {
    severity: "critical",
    label: "Critical",
    description: "Release blockers and fatal parse issues.",
    className: "border-destructive/25 bg-destructive/8",
  },
  {
    severity: "high",
    label: "High",
    description: "Strong production risks that usually need action before rollout.",
    className: "border-destructive/18 bg-destructive/6",
  },
  {
    severity: "medium",
    label: "Medium",
    description: "Important warnings that can turn into incidents under load.",
    className: "border-warning/25 bg-warning/8",
  },
  {
    severity: "low",
    label: "Low",
    description: "Smaller improvements that still tighten production posture.",
    className: "border-info/25 bg-info/8",
  },
  {
    severity: "info",
    label: "Info",
    description: "Contextual notes and softer best-practice guidance.",
    className: "border-border bg-background-muted/35",
  },
];

export function SeveritySummaryCards({
  severityCounts,
}: SeveritySummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {severityCardConfig.map((item) => (
        <Card key={item.severity} className={item.className}>
          <CardContent className="grid gap-3 p-5">
            <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
              {item.label}
            </p>
            <p className="text-foreground text-3xl font-semibold">
              {severityCounts[item.severity]}
            </p>
            <p className="text-muted text-sm leading-6">{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
