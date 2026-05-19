import { extractNetpolBundle } from "@/lib/netpol-review/extract";
import { netpolRules } from "@/lib/netpol-review/rules";
import type {
  NetpolAnalysisReport,
  NetpolFinding,
  NetpolFindingSeverity,
} from "@/lib/netpol-review/types";

export const networkPolicyReviewerToolId = "networkpolicy-reviewer";

export function analyzeNetworkPolicies(raw: string): NetpolAnalysisReport {
  const bundle = extractNetpolBundle(raw);

  if (!bundle.parseResult.ok) {
    return {
      ok: false,
      message: "Fix YAML parse errors before reviewing NetworkPolicy manifests.",
      summary: bundle.parseResult.errors.map((error) => error.message).join(" "),
      findings: [],
      resources: bundle.policies,
      workloadCount: bundle.workloadCount,
      severityCounts: {},
    };
  }

  if (bundle.policies.length === 0) {
    return {
      ok: true,
      message: "No NetworkPolicy documents were found in this bundle.",
      summary: "Load a sample or paste manifests that include NetworkPolicy resources.",
      findings: [],
      resources: [],
      workloadCount: bundle.workloadCount,
      severityCounts: {},
    };
  }

  const findings = netpolRules.flatMap((rule) =>
    rule.run({
      policies: bundle.policies,
      workloadCount: bundle.workloadCount,
    }),
  );

  const severityCounts = findings.reduce<
    Partial<Record<NetpolFindingSeverity, number>>
  >((counts, finding: NetpolFinding) => {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
    return counts;
  }, {});

  return {
    ok: !findings.some((finding) => finding.severity === "critical"),
    message:
      findings.length === 0
        ? "No NetworkPolicy review findings for this bundle."
        : `${findings.length} NetworkPolicy finding${findings.length === 1 ? "" : "s"} detected.`,
    summary: `Reviewed ${bundle.policies.length} NetworkPolicy object${bundle.policies.length === 1 ? "" : "s"} across the pasted bundle.`,
    findings,
    resources: bundle.policies,
    workloadCount: bundle.workloadCount,
    severityCounts,
  };
}
