import {
  AlertCircle,
  AlertOctagon,
  CircleDashed,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { K8sFindingSeverity } from "@/lib/k8s/types";

type SeverityBadgeProps = {
  severity: K8sFindingSeverity;
};

const severityConfig: Record<
  K8sFindingSeverity,
  {
    label: string;
    variant: "info" | "warning" | "destructive";
    Icon: typeof AlertCircle;
  }
> = {
  critical: {
    label: "Critical",
    variant: "destructive",
    Icon: AlertOctagon,
  },
  low: { label: "Low", variant: "info", Icon: CircleDashed },
  medium: { label: "Medium", variant: "warning", Icon: TriangleAlert },
  high: { label: "High", variant: "destructive", Icon: ShieldAlert },
  info: { label: "Info", variant: "info", Icon: AlertCircle },
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  const { Icon } = config;

  return (
    <Badge variant={config.variant}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  );
}
