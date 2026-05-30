import { describe, expect, it } from "vitest";
import { analyzeHelmValues } from "@/lib/helm/analyzer";
import { riskyHelmValuesExample } from "@/lib/helm/examples";

describe("analyzeHelmValues", () => {
  it("flags risky helm values", () => {
    const report = analyzeHelmValues(riskyHelmValuesExample, {
      profile: "strict",
    });
    const ruleIds = report.findings.map((finding) => finding.ruleId);

    expect(ruleIds).toContain("mutable-image-tag");
    expect(ruleIds).toContain("plaintext-secret-value");
    expect(ruleIds).toContain("privileged-container-values");
  });

  it("returns no findings for blank input root", () => {
    const report = analyzeHelmValues("   ");
    expect(report.findings).toEqual([]);
  });

  it("flags nested container image tags in arrays", () => {
    const yaml = `
containers:
  - name: api
    image: nginx:latest
    securityContext:
      privileged: true
`;
    const report = analyzeHelmValues(yaml, { profile: "strict" });
    const ruleIds = report.findings.map((finding) => finding.ruleId);
    expect(ruleIds).toContain("mutable-image-tag");
    expect(ruleIds).toContain("privileged-container-values");
  });
});
