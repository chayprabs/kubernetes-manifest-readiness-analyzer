import { clamp } from "@/lib/utils";
import type { K8sFinding, K8sFindingSeverity } from "@/lib/k8s/types";

export const readinessSeverityWeights: Record<K8sFindingSeverity, number> = {
  critical: 40,
  high: 20,
  medium: 10,
  low: 4,
  info: 1,
};

export function calculateReadinessScore(findings: K8sFinding[]) {
  const deduction = findings.reduce(
    (total, finding) => total + readinessSeverityWeights[finding.severity],
    0,
  );

  return clamp(100 - deduction, 0, 100);
}
