import { describe, expect, it } from "vitest";
import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import { basicK8sRules } from "@/lib/k8s/rules/basic";
import { loadK8sFixture } from "@/lib/k8s/__tests__/fixture-loader";

function analyzeBasicRules(
  manifest: string,
  options: Parameters<typeof analyzeK8sManifests>[1] = {},
) {
  return analyzeK8sManifests(manifest, {
    ...options,
    rules: basicK8sRules,
  });
}

describe("Kubernetes relationship-derived basic rules", () => {
  it("flags PodDisruptionBudgets whose selectors protect nothing", () => {
    const report = analyzeBasicRules(loadK8sFixture("pdb-mismatch.yaml"));
    const findings = report.findings.filter(
      (finding) => finding.ruleId === "pdb-selector-matches-nothing",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "reliability",
      severity: "medium",
      message: expect.stringContaining('PodDisruptionBudget "catalog-api-pdb"'),
      recommendation: expect.stringContaining("selector"),
    });
  });

  it("flags HPAs that reference workloads not present in the bundle", () => {
    const report = analyzeBasicRules(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: apps
spec:
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/example/api:1.0.0
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: apps
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-v2`);
    const findings = report.findings.filter(
      (finding) => finding.ruleId === "hpa-target-not-found",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "scalability",
      severity: "high",
      message: expect.stringContaining('HorizontalPodAutoscaler "api-hpa"'),
      recommendation: expect.stringContaining("scaleTargetRef"),
    });
  });
});
