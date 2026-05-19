import { collectHelmValuePaths } from "@/lib/helm/paths";
import { parseHelmValuesYaml } from "@/lib/helm/parser";
import { analyzeHelmPrivacy } from "@/lib/helm/privacy";
import { helmRules } from "@/lib/helm/rules";
import type {
  HelmAnalysisReport,
  HelmAnalyzerOptions,
  HelmFindingSeverity,
  HelmRuleContext,
} from "@/lib/helm/types";

export function analyzeHelmValues(
  raw: string,
  options: HelmAnalyzerOptions = {},
): HelmAnalysisReport {
  const profile = options.profile ?? "balanced";

  if (raw.trim().length === 0) {
    const parseResult = parseHelmValuesYaml("");
    const privacy = analyzeHelmPrivacy(raw);
    return {
      ok: true,
      message: "Paste Helm values to begin the review.",
      summary: "No values content to analyze yet.",
      profile,
      findings: [],
      severityCounts: {},
      parseResult,
      privacy,
      canShareReportSafely: !privacy.sensitiveDataDetected,
    };
  }

  const parseResult = parseHelmValuesYaml(raw);
  const privacy = analyzeHelmPrivacy(raw);

  if (!parseResult.ok || !parseResult.root) {
    return {
      ok: false,
      message: "Fix values.yaml parse errors before trusting Helm guidance.",
      summary: parseResult.errors.join(" "),
      profile,
      findings: [],
      severityCounts: {},
      parseResult,
      privacy,
      canShareReportSafely: !privacy.sensitiveDataDetected,
    };
  }

  const context: HelmRuleContext = {
    root: parseResult.root,
    paths: collectHelmValuePaths(parseResult.root),
    profile,
  };

  const findings = helmRules.flatMap((rule) => rule.run(context));
  const severityCounts = countSeverities(findings);

  return {
    ok: findings.every((finding) => finding.severity !== "critical"),
    message:
      findings.length === 0
        ? "No Helm values risks detected by these checks."
        : `${findings.length} Helm values finding${findings.length === 1 ? "" : "s"} detected.`,
    summary: buildSummary(findings.length, severityCounts),
    profile,
    findings,
    severityCounts,
    parseResult,
    privacy,
    canShareReportSafely: !privacy.sensitiveDataDetected,
  };
}

function countSeverities(
  findings: HelmAnalysisReport["findings"],
): Partial<Record<HelmFindingSeverity, number>> {
  return findings.reduce<Partial<Record<HelmFindingSeverity, number>>>(
    (counts, finding) => {
      counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
      return counts;
    },
    {},
  );
}

function buildSummary(
  findingCount: number,
  severityCounts: Partial<Record<HelmFindingSeverity, number>>,
) {
  if (findingCount === 0) {
    return "Helm values look clean for the checks in this profile.";
  }

  const high = severityCounts.high ?? 0;
  const critical = severityCounts.critical ?? 0;

  return `Found ${findingCount} values issue${findingCount === 1 ? "" : "s"} (${critical} critical, ${high} high).`;
}

export const helmValuesCheckerToolId = "helm-values-checker";
