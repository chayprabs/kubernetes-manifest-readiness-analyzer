export type HelmFindingSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type HelmProfileId = "balanced" | "strict";

export type HelmFinding = {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: HelmFindingSeverity;
  path: string;
  recommendation: string;
};

export type HelmParseResult = {
  ok: boolean;
  root: Record<string, unknown> | null;
  errors: string[];
  sizeBytes: number;
};

export type HelmPrivacySummary = {
  sensitiveDataDetected: boolean;
  signalCount: number;
};

export type HelmAnalysisReport = {
  ok: boolean;
  message: string;
  summary: string;
  profile: HelmProfileId;
  findings: HelmFinding[];
  severityCounts: Partial<Record<HelmFindingSeverity, number>>;
  parseResult: HelmParseResult;
  privacy: HelmPrivacySummary;
  canShareReportSafely: boolean;
};

export type HelmAnalyzerOptions = {
  profile?: HelmProfileId;
};

export type HelmRuleContext = {
  root: Record<string, unknown>;
  paths: HelmValuePath[];
  profile: HelmProfileId;
};

export type HelmValuePath = {
  path: string;
  value: unknown;
};

export type HelmRule = {
  id: string;
  title: string;
  defaultSeverity: HelmFindingSeverity;
  run: (context: HelmRuleContext) => HelmFinding[];
};
