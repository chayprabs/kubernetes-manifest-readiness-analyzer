import type { NetpolFinding, NetpolFindingSeverity } from "@/lib/netpol-review/types";

export function createNetpolFinding(input: {
  ruleId: string;
  title: string;
  defaultSeverity: NetpolFindingSeverity;
  resourceLabel: string;
  message: string;
  severity?: NetpolFindingSeverity;
  recommendation: string;
}): NetpolFinding {
  return {
    id: `${input.ruleId}:${input.resourceLabel}`,
    ruleId: input.ruleId,
    title: input.title,
    message: input.message,
    severity: input.severity ?? input.defaultSeverity,
    resourceLabel: input.resourceLabel,
    recommendation: input.recommendation,
  };
}
