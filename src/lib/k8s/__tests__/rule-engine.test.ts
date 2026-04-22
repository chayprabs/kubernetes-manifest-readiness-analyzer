import { describe, expect, it } from "vitest";
import { analyzeK8sManifests, sampleManifest } from "@/lib/k8s/analyzer";
import { createFinding } from "@/lib/k8s/findings";
import type { K8sRule } from "@/lib/k8s/types";

describe("Kubernetes rule engine", () => {
  it("returns an empty no-op report for blank input", () => {
    const report = analyzeK8sManifests("   ");

    expect(report.ok).toBe(true);
    expect(report.state).toBe("empty");
    expect(report.findings).toEqual([]);
    expect(report.readinessScore).toBe(100);
    expect(report.message).toContain("Paste Kubernetes YAML");
  });

  it("turns parse errors into critical schema findings", () => {
    const report = analyzeK8sManifests(`apiVersion: apps/v1
kind: Deployment
metadata:
\tname: broken`);

    expect(report.ok).toBe(false);
    expect(report.state).toBe("invalid");
    expect(report.findings[0]).toMatchObject({
      category: "schema",
      severity: "critical",
    });
    expect(report.fatalParseErrors.length).toBeGreaterThan(0);
  });

  it("sorts findings by severity before category and resource identity", () => {
    const rules: K8sRule[] = [
      {
        id: "low-rule",
        title: "Low rule",
        description: "Produces a low-severity finding for sorting coverage.",
        category: "operations",
        defaultSeverity: "low",
        run(context) {
          const workload = context.workloads[0];

          if (!workload) {
            return [];
          }

          return createFinding({
            id: "low-rule:demo",
            ruleId: "low-rule",
            title: "Low rule finding",
            message: "Lower severity finding.",
            severity: "low",
            category: "operations",
            resourceRef: workload.ref,
            whyItMatters:
              "Sorting should place this after higher severity items.",
            recommendation: "No action required for the test.",
          });
        },
      },
      {
        id: "high-rule",
        title: "High rule",
        description: "Produces a high-severity finding for sorting coverage.",
        category: "security",
        defaultSeverity: "high",
        run(context) {
          const workload = context.workloads[0];

          if (!workload) {
            return [];
          }

          return createFinding({
            id: "high-rule:demo",
            ruleId: "high-rule",
            title: "High rule finding",
            message: "Higher severity finding.",
            severity: "high",
            category: "security",
            resourceRef: workload.ref,
            whyItMatters: "Sorting should place this first.",
            recommendation: "No action required for the test.",
          });
        },
      },
    ];
    const report = analyzeK8sManifests(
      `apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo
spec:
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
        - name: demo
          image: ghcr.io/authos/demo:1.0.0`,
      { rules },
    );

    expect(report.findings.map((finding) => finding.ruleId)).toEqual([
      "high-rule",
      "low-rule",
    ]);
  });

  it("reduces the readiness score when high-severity findings exist", () => {
    const report = analyzeK8sManifests(sampleManifest);

    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.readinessScore).toBeLessThan(100);
  });

  it("lets profiles suppress or elevate rules", () => {
    const beginnerReport = analyzeK8sManifests(sampleManifest, {
      profile: "beginner",
    });
    const securityReport = analyzeK8sManifests(sampleManifest, {
      profile: "security",
    });

    expect(
      beginnerReport.findings.some(
        (finding) => finding.ruleId === "mutable-image-tag",
      ),
    ).toBe(false);
    expect(
      securityReport.findings.find(
        (finding) => finding.ruleId === "run-as-non-root",
      )?.severity,
    ).toBe("high");
  });
});
