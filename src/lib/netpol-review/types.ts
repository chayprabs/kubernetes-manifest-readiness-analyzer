export type NetpolFindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export type NetpolFinding = {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: NetpolFindingSeverity;
  resourceLabel: string;
  recommendation: string;
};

export type NetpolResource = {
  id: string;
  name: string;
  namespace: string;
  ref: string;
  record: Record<string, unknown>;
};

export type NetpolAnalysisReport = {
  ok: boolean;
  message: string;
  summary: string;
  findings: NetpolFinding[];
  resources: NetpolResource[];
  workloadCount: number;
  severityCounts: Partial<Record<NetpolFindingSeverity, number>>;
};
