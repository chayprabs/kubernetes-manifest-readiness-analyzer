import { Badge } from "@/components/ui/badge";
import type { K8sFindingSeverity } from "@/lib/k8s/types";

type SeverityBadgeProps = {
  severity: K8sFindingSeverity;
};

const severityConfig: Record<
  K8sFindingSeverity,
  { label: string; variant: "info" | "warning" | "destructive" }
> = {
  critical: { label: "Critical", variant: "destructive" },
  low: { label: "Low", variant: "info" },
  medium: { label: "Medium", variant: "warning" },
  high: { label: "High", variant: "destructive" },
  info: { label: "Info", variant: "info" },
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = severityConfig[severity];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
