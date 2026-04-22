import { describe, expect, it } from "vitest";
import {
  analyzeK8sManifests,
  sampleBrokenManifest,
  sampleProductionReadyManifest,
} from "@/lib/k8s/analyzer";
import { createFinding } from "@/lib/k8s/findings";
import type { K8sRule } from "@/lib/k8s/types";

function buildStaticRule(
  id: string,
  severity: "critical" | "high" | "medium" | "low",
  category: K8sRule["category"],
  count = 1,
): K8sRule {
  return {
    id,
    title: id,
    description: `Synthetic ${id} rule for scoring coverage.`,
    category,
    defaultSeverity: severity,
    run(context) {
      const resourceRef = context.workloads[0]?.ref ?? {
        documentIndex: -1,
        apiVersion: undefined,
        kind: undefined,
        name: undefined,
        namespace: undefined,
      };

      return Array.from({ length: count }, (_, index) =>
        createFinding({
          id: `${id}:${index}`,
          ruleId: id,
          title: `${id} finding ${index + 1}`,
          message: `Synthetic ${id} finding ${index + 1}.`,
          severity,
          category,
          resourceRef,
          whyItMatters: "Scoring should rank and weight this finding consistently.",
          recommendation: "No action required for the unit test.",
          confidence: "high",
        }),
      );
    },
  };
}

describe("Kubernetes scoring", () => {
  it("gives a clean manifest a high readiness score", () => {
    const report = analyzeK8sManifests(sampleProductionReadyManifest);

    expect(report.findings).toEqual([]);
    expect(report.readinessScore).toBe(100);
    expect(report.readinessGrade).toBe("Production ready with minor notes");
    expect(report.riskLevel).toBe("low");
    expect(report.categoryScores.reliability).toBe(100);
    expect(report.resourceSummary.workloadsFound).toBe(1);
  });

  it("drops the score when a critical finding exists", () => {
    const report = analyzeK8sManifests(sampleProductionReadyManifest, {
      rules: [buildStaticRule("critical-runtime-risk", "critical", "security")],
    });

    expect(report.readinessScore).toBeLessThan(60);
    expect(report.readinessGrade).toBe("High risk");
    expect(report.fixFirstFindings[0]?.ruleId).toBe("critical-runtime-risk");
  });

  it("does not let many low findings zero out the score", () => {
    const report = analyzeK8sManifests(sampleProductionReadyManifest, {
      rules: [buildStaticRule("low-noise", "low", "operations", 30)],
    });

    expect(report.readinessScore).toBeGreaterThan(60);
    expect(report.readinessScore).toBeLessThan(100);
    expect(report.readinessGrade).not.toBe("Not production ready");
  });

  it("weights security findings more in the security profile", () => {
    const rules = [buildStaticRule("security-warning", "medium", "security")];
    const balancedReport = analyzeK8sManifests(sampleProductionReadyManifest, {
      rules,
      profile: "balanced",
    });
    const securityReport = analyzeK8sManifests(sampleProductionReadyManifest, {
      rules,
      profile: "security",
    });

    expect(securityReport.readinessScore).toBeLessThan(
      balancedReport.readinessScore,
    );
    expect(securityReport.categoryScores.security).toBeLessThan(
      balancedReport.categoryScores.security,
    );
  });

  it("marks fatal parse errors as not production ready", () => {
    const report = analyzeK8sManifests(`apiVersion: apps/v1
kind: Deployment
metadata:
\tname: broken`);

    expect(report.state).toBe("invalid");
    expect(report.readinessScore).toBeLessThanOrEqual(20);
    expect(report.readinessGrade).toBe("Not production ready");
    expect(report.riskLevel).toBe("critical");
  });

  it("only generates positive checks when evidence exists", () => {
    const cleanReport = analyzeK8sManifests(sampleProductionReadyManifest);
    const brokenReport = analyzeK8sManifests(sampleBrokenManifest);

    expect(cleanReport.positiveChecks.map((check) => check.id)).toEqual(
      expect.arrayContaining([
        "readiness-probes-present",
        "resources-configured",
        "pdb-present",
        "securitycontext-hardened",
      ]),
    );
    expect(brokenReport.positiveChecks).toEqual([]);
  });

  it("produces deterministic summary fields", () => {
    const first = analyzeK8sManifests(sampleBrokenManifest);
    const second = analyzeK8sManifests(sampleBrokenManifest);

    expect(first.readinessScore).toBe(second.readinessScore);
    expect(first.headline).toBe(second.headline);
    expect(first.summary).toBe(second.summary);
    expect(first.nextSteps).toBe(second.nextSteps);
  });
});
