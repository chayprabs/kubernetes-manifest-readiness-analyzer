import type { HelmFinding, HelmFindingSeverity, HelmRule } from "@/lib/helm/types";

export function createHelmFinding(input: {
  rule: HelmRule;
  path: string;
  message: string;
  severity?: HelmFindingSeverity;
  recommendation?: string;
}): HelmFinding {
  return {
    id: `${input.rule.id}:${input.path}`,
    ruleId: input.rule.id,
    title: input.rule.title,
    message: input.message,
    severity: input.severity ?? input.rule.defaultSeverity,
    path: input.path,
    recommendation: input.recommendation ?? input.rule.title,
  };
}
