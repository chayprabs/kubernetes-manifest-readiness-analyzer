import { describe, expect, it } from "vitest";
import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import {
  apiVersionK8sRules,
  operationsK8sRules,
  schemaK8sRules,
} from "@/lib/k8s/rules";
import {
  cronJobBetaManifest,
  customResourceInstanceManifest,
  defaultNamespaceManifest,
  deprecatedIngressManifest,
  duplicateDeploymentManifest,
  missingNamespaceManifest,
  missingOwnerMetadataManifest,
  missingRecommendedLabelsManifest,
  pdbBetaManifest,
  selectorMismatchManifest,
} from "@/lib/k8s/__tests__/fixtures/schema-api-version-operations.fixtures";

function analyzePackManifest(
  manifest: string,
  options: Parameters<typeof analyzeK8sManifests>[1] = {},
) {
  return analyzeK8sManifests(manifest, {
    ...options,
    rules: [...apiVersionK8sRules, ...schemaK8sRules, ...operationsK8sRules],
  });
}

function findingsByRuleId(manifest: string, ruleId: string) {
  return analyzePackManifest(manifest).findings.filter(
    (finding) => finding.ruleId === ruleId,
  );
}

describe("Kubernetes schema, API-version, and operations rules", () => {
  it("continues converting parser missing-field issues into schema findings", () => {
    const report = analyzePackManifest(`kind: Deployment
metadata:
  name: broken`);

    expect(
      report.findings.find(
        (finding) => finding.ruleId === "schema/missing-api-version",
      ),
    ).toMatchObject({
      category: "schema",
      severity: "critical",
    });
  });

  it("detects deprecated Ingress APIs against the selected target version", () => {
    const findings = analyzePackManifest(deprecatedIngressManifest, {
      kubernetesTargetVersion: "1.24",
    }).findings.filter((finding) => finding.ruleId === "deprecated-api-version");

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "high",
      message: expect.stringContaining("not served"),
      recommendation: expect.stringContaining("networking.k8s.io/v1"),
    });
  });

  it("scores CronJob batch/v1beta1 findings differently depending on the target version", () => {
    const target124 = analyzePackManifest(cronJobBetaManifest, {
      kubernetesTargetVersion: "1.24",
    }).findings.filter((finding) => finding.ruleId === "deprecated-api-version");
    const target125 = analyzePackManifest(cronJobBetaManifest, {
      kubernetesTargetVersion: "1.25",
    }).findings.filter((finding) => finding.ruleId === "deprecated-api-version");

    expect(target124[0]).toMatchObject({
      severity: "medium",
      message: expect.stringContaining("scheduled to stop being served"),
    });
    expect(target125[0]?.severity).toBe("high");
  });

  it("scores PodDisruptionBudget policy/v1beta1 findings differently depending on the target version", () => {
    const target124 = analyzePackManifest(pdbBetaManifest, {
      kubernetesTargetVersion: "1.24",
    }).findings.filter((finding) => finding.ruleId === "deprecated-api-version");
    const target125 = analyzePackManifest(pdbBetaManifest, {
      kubernetesTargetVersion: "1.25",
    }).findings.filter((finding) => finding.ruleId === "deprecated-api-version");

    expect(target124[0]?.severity).toBe("medium");
    expect(target125[0]?.severity).toBe("high");
  });

  it("detects duplicate resource identities in the same pasted bundle", () => {
    const findings = findingsByRuleId(
      duplicateDeploymentManifest,
      "duplicate-object-identity",
    );

    expect(findings).toHaveLength(2);
    expect(findings[0]?.message).toContain('Deployment "api" appears 2 times');
  });

  it("detects Deployment selector mismatches", () => {
    const findings = findingsByRuleId(
      selectorMismatchManifest,
      "deployment-selector-mismatch",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "high",
      category: "schema",
    });
  });

  it("warns when recommended app labels are missing", () => {
    const findings = findingsByRuleId(
      missingRecommendedLabelsManifest,
      "missing-recommended-app-labels",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "best-practice",
      recommendation: expect.stringContaining("app.kubernetes.io"),
    });
  });

  it("warns on missing namespaces and only flags hardcoded default namespace in strict mode", () => {
    const missingNamespace = findingsByRuleId(
      missingNamespaceManifest,
      "missing-namespace",
    );
    const defaultNamespaceBalanced = analyzePackManifest(defaultNamespaceManifest)
      .findings.filter((finding) => finding.ruleId === "hardcoded-default-namespace");
    const defaultNamespaceStrict = analyzePackManifest(defaultNamespaceManifest, {
      profile: "strict",
    }).findings.filter((finding) => finding.ruleId === "hardcoded-default-namespace");

    expect(missingNamespace).toHaveLength(1);
    expect(missingNamespace[0]?.severity).toBe("low");
    expect(defaultNamespaceBalanced).toHaveLength(0);
    expect(defaultNamespaceStrict).toHaveLength(1);
  });

  it("warns when owner/team metadata is missing and flags large ConfigMaps as a size placeholder check", () => {
    const ownership = findingsByRuleId(
      missingOwnerMetadataManifest,
      "missing-owner-team-annotations",
    );
    const largePayload = "x".repeat(600 * 1024);
    const largeConfigMapManifest = `apiVersion: v1
kind: ConfigMap
metadata:
  name: large-config
data:
  payload: ${largePayload}`;
    const largeConfig = analyzePackManifest(largeConfigMapManifest).findings.filter(
      (finding) => finding.ruleId === "large-config-or-secret",
    );

    expect(ownership).toHaveLength(1);
    expect(largeConfig).toHaveLength(1);
    expect(largeConfig[0]).toMatchObject({
      confidence: "medium",
    });
  });

  it("handles custom resources without crashing and only emits a low-noise uncommon-kind finding when info is enabled", () => {
    const report = analyzePackManifest(customResourceInstanceManifest, {
      includeInfoFindings: true,
    });

    expect(report.ok).toBe(true);
    expect(
      report.findings.find(
        (finding) => finding.ruleId === "unknown-or-uncommon-kind",
      ),
    ).toMatchObject({
      severity: "info",
    });
  });
});
