import { describe, expect, it } from "vitest";
import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import { parseK8sYaml } from "@/lib/k8s/parser";
import { loadK8sFixture } from "@/lib/k8s/__tests__/fixture-loader";

describe("fixture-backed Kubernetes analyzer scenarios", () => {
  it("parses a multi-namespace bundle and keeps both namespaces in the summary", () => {
    const report = analyzeK8sManifests(
      loadK8sFixture("multi-namespace-bundle.yaml"),
    );

    expect(report.ok).toBe(true);
    expect(report.resourceSummary.totalObjects).toBe(6);
    expect(report.resourceSummary.namespacesFound).toEqual(["edge", "jobs"]);
    expect(report.relationshipGraph.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "service-targets",
          sourceRef: expect.objectContaining({
            kind: "Service",
            name: "edge-api",
          }),
          targetRef: expect.objectContaining({
            kind: "Deployment",
            name: "edge-api",
          }),
        }),
      ]),
    );
  });

  it("surfaces a friendly YAML syntax error for the invalid-yaml fixture", () => {
    const result = parseK8sYaml(loadK8sFixture("invalid-yaml.yaml"));

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatchObject({
      code: "yaml-syntax",
      documentIndex: 0,
      yamlCode: "TAB_AS_INDENT",
    });
  });

  it("finds the selector drift in the service-selector-mismatch fixture", () => {
    const report = analyzeK8sManifests(
      loadK8sFixture("service-selector-mismatch.yaml"),
    );

    expect(
      report.findings.find(
        (finding) => finding.ruleId === "service-selector-matches-nothing",
      ),
    ).toMatchObject({
      severity: "high",
      category: "networking",
      message: expect.stringContaining("checkout-api"),
    });
  });

  it("flags internet-facing exposure in the public-loadbalancer fixture", () => {
    const report = analyzeK8sManifests(
      loadK8sFixture("public-loadbalancer-ingress-no-tls.yaml"),
    );
    const ruleIds = report.findings.map((finding) => finding.ruleId);

    expect(ruleIds).toEqual(
      expect.arrayContaining([
        "loadbalancer-exposure",
        "ingress-without-tls",
        "networkpolicy-absent-for-namespace",
      ]),
    );
  });

  it("flags the missing CronJob safety settings in the cronjob-risk fixture", () => {
    const report = analyzeK8sManifests(loadK8sFixture("cronjob-risk.yaml"));
    const ruleIds = report.findings.map((finding) => finding.ruleId);

    expect(ruleIds).toEqual(
      expect.arrayContaining([
        "cronjob-missing-concurrency-policy",
        "cronjob-missing-history-limits",
      ]),
    );
  });
});
