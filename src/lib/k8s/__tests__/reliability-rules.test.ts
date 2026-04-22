import { describe, expect, it } from "vitest";
import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import { reliabilityK8sRules } from "@/lib/k8s/rules";
import {
  cronJobMissingConcurrencyPolicy,
  cronJobMissingHistoryLimits,
  deploymentMissingProbesResources,
  deploymentProbePortMismatch,
  deploymentRiskyMaxUnavailable,
  deploymentStartupProbeSuggestion,
  deploymentWithLatestImage,
  deploymentWithNoImageTag,
  deploymentWithServiceAndPdb,
  jobMissingBackoffLimit,
  pdbTooRestrictiveManifest,
  statefulSetThreeReplicasNoPdb,
} from "@/lib/k8s/__tests__/fixtures/reliability.fixtures";

function analyzeReliabilityManifest(
  manifest: string,
  options: Parameters<typeof analyzeK8sManifests>[1] = {},
) {
  return analyzeK8sManifests(manifest, {
    ...options,
    rules: reliabilityK8sRules,
  });
}

function findingsByRuleId(manifest: string, ruleId: string) {
  return analyzeReliabilityManifest(manifest).findings.filter(
    (finding) => finding.ruleId === ruleId,
  );
}

describe("Kubernetes reliability rules", () => {
  it("flags missing probes and resources on a basic Deployment with actionable fixes", () => {
    const report = analyzeReliabilityManifest(deploymentMissingProbesResources);
    const ruleIds = report.findings.map((finding) => finding.ruleId);

    expect(ruleIds).toEqual(
      expect.arrayContaining([
        "missing-readiness-probe",
        "missing-liveness-probe",
        "missing-resource-requests",
        "missing-resource-limits",
        "single-replica-deployment",
        "deployment-max-unavailable-risk",
      ]),
    );

    expect(
      report.findings.find(
        (finding) => finding.ruleId === "missing-readiness-probe",
      ),
    ).toMatchObject({
      whyItMatters: expect.stringContaining("Service traffic"),
      recommendation: expect.stringContaining("adjust the path, port, and timing"),
      fix: {
        type: "yaml-snippet",
        snippet: expect.stringContaining("tcpSocket"),
      },
    });

    expect(
      report.findings.find(
        (finding) => finding.ruleId === "missing-resource-requests",
      ),
    ).toMatchObject({
      whyItMatters: expect.stringContaining("scheduler"),
      recommendation: expect.stringContaining("placeholder"),
      fix: {
        snippet: expect.stringContaining("requests"),
      },
    });
  });

  it("does not flag probe or resource gaps when a Deployment already defines them", () => {
    const report = analyzeReliabilityManifest(deploymentWithServiceAndPdb);
    const ruleIds = new Set(report.findings.map((finding) => finding.ruleId));

    expect(ruleIds.has("missing-readiness-probe")).toBe(false);
    expect(ruleIds.has("missing-liveness-probe")).toBe(false);
    expect(ruleIds.has("missing-resource-requests")).toBe(false);
    expect(ruleIds.has("missing-resource-limits")).toBe(false);
    expect(ruleIds.has("probe-port-mismatch")).toBe(false);
  });

  it("suggests a startup probe for slow-starting containers with delayed liveness checks", () => {
    const findings = findingsByRuleId(
      deploymentStartupProbeSuggestion,
      "startup-probe-suggestion",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "low",
      recommendation: expect.stringContaining("startupProbe"),
      fix: {
        snippet: expect.stringContaining("startupProbe"),
      },
    });
  });

  it("warns when a StatefulSet with 3 replicas has no matching PodDisruptionBudget", () => {
    const balanced = findingsByRuleId(
      statefulSetThreeReplicasNoPdb,
      "missing-pod-disruption-budget",
    );
    const strict = analyzeReliabilityManifest(statefulSetThreeReplicasNoPdb, {
      profile: "strict",
    }).findings.filter(
      (finding) => finding.ruleId === "missing-pod-disruption-budget",
    );

    expect(balanced).toHaveLength(1);
    expect(balanced[0]).toMatchObject({
      severity: "low",
      fix: {
        snippet: expect.stringContaining("PodDisruptionBudget"),
      },
    });
    expect(strict[0]?.severity).toBe("medium");
  });

  it("does not warn about a missing PodDisruptionBudget when one matches the Deployment labels", () => {
    const report = analyzeReliabilityManifest(deploymentWithServiceAndPdb);

    expect(
      report.findings.some(
        (finding) => finding.ruleId === "missing-pod-disruption-budget",
      ),
    ).toBe(false);
  });

  it("flags overly permissive rollout unavailability on a small Deployment", () => {
    const findings = findingsByRuleId(
      deploymentRiskyMaxUnavailable,
      "deployment-max-unavailable-risk",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "medium",
      message: expect.stringContaining("maxUnavailable"),
      fix: {
        snippet: expect.stringContaining("maxUnavailable: 0"),
      },
    });
  });

  it("warns when a PodDisruptionBudget requires every replica to stay available", () => {
    const findings = findingsByRuleId(
      pdbTooRestrictiveManifest,
      "pdb-too-restrictive",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      recommendation: expect.stringContaining("maxUnavailable: 1"),
      fix: {
        snippet: expect.stringContaining("minAvailable: 2"),
      },
    });
  });

  it("flags mutable image references for latest tags and missing tags", () => {
    expect(
      findingsByRuleId(deploymentWithLatestImage, "mutable-image-tag"),
    ).toHaveLength(1);
    expect(
      findingsByRuleId(deploymentWithNoImageTag, "mutable-image-tag"),
    ).toHaveLength(1);
  });

  it("warns when a health probe references a named port that does not exist", () => {
    const findings = findingsByRuleId(
      deploymentProbePortMismatch,
      "probe-port-mismatch",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      message: expect.stringContaining('named port "http"'),
      recommendation: expect.stringContaining("numeric port"),
    });
  });

  it("warns when a CronJob does not declare a concurrencyPolicy", () => {
    const findings = findingsByRuleId(
      cronJobMissingConcurrencyPolicy,
      "cronjob-missing-concurrency-policy",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "medium",
      recommendation: expect.stringContaining("Forbid"),
    });
  });

  it("warns when a CronJob does not declare history limits", () => {
    const findings = findingsByRuleId(
      cronJobMissingHistoryLimits,
      "cronjob-missing-history-limits",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "low",
      fix: {
        snippet: expect.stringContaining("successfulJobsHistoryLimit"),
      },
    });
  });

  it("warns when a Job does not set backoffLimit and escalates it in strict mode", () => {
    const balanced = findingsByRuleId(
      jobMissingBackoffLimit,
      "job-missing-backoff-limit",
    );
    const strict = analyzeReliabilityManifest(jobMissingBackoffLimit, {
      profile: "strict",
    }).findings.filter(
      (finding) => finding.ruleId === "job-missing-backoff-limit",
    );

    expect(balanced).toHaveLength(1);
    expect(balanced[0]?.severity).toBe("low");
    expect(strict[0]?.severity).toBe("medium");
  });

  it("raises the single-replica Deployment warning and makes it stricter in strict mode", () => {
    const balanced = findingsByRuleId(
      deploymentMissingProbesResources,
      "single-replica-deployment",
    );
    const strict = analyzeReliabilityManifest(deploymentMissingProbesResources, {
      profile: "strict",
    }).findings.filter(
      (finding) => finding.ruleId === "single-replica-deployment",
    );

    expect(balanced).toHaveLength(1);
    expect(balanced[0]).toMatchObject({
      severity: "low",
      fix: {
        type: "strategic-merge-patch-like",
        snippet: expect.stringContaining("replicas: 2"),
      },
    });
    expect(strict[0]).toMatchObject({
      severity: "medium",
      fix: {
        type: "strategic-merge-patch-like",
        snippet: expect.stringContaining("replicas: 3"),
      },
    });
  });

  it("keeps missing liveness lower than readiness in balanced and raises it in strict", () => {
    const balanced = analyzeReliabilityManifest(
      deploymentMissingProbesResources,
    ).findings;
    const strict = analyzeReliabilityManifest(deploymentMissingProbesResources, {
      profile: "strict",
    }).findings;

    expect(
      balanced.find((finding) => finding.ruleId === "missing-readiness-probe")
        ?.severity,
    ).toBe("high");
    expect(
      balanced.find((finding) => finding.ruleId === "missing-liveness-probe")
        ?.severity,
    ).toBe("medium");
    expect(
      strict.find((finding) => finding.ruleId === "missing-liveness-probe")
        ?.severity,
    ).toBe("high");
  });
});
