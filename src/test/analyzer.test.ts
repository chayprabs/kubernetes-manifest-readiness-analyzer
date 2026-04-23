import { describe, expect, it } from "vitest";
import {
  analyzeK8sManifests,
  analyzeManifestText,
  sampleManifest,
} from "@/lib/k8s/analyzer";
import { getInputSizeBytes } from "@/lib/k8s/errors";
import { generatedPerformanceManifest } from "@/lib/k8s/__tests__/fixtures/performance.fixtures";

describe("analyzeManifestText", () => {
  it("returns no findings for blank input", () => {
    expect(analyzeManifestText("   ")).toEqual([]);
  });

  it("flags the sample manifest for missing production checks", () => {
    const findings = analyzeManifestText(sampleManifest);
    const findingIds = findings.map((finding) => finding.ruleId);

    expect(findingIds).toContain("missing-resource-requests");
    expect(findingIds).toContain("missing-resource-limits");
    expect(findingIds).toContain("missing-readiness-probe");
    expect(findingIds).toContain("missing-liveness-probe");
    expect(findingIds).toContain("mutable-image-tag");
    expect(findingIds).toContain("run-as-non-root");
  });
});

describe("analyzeK8sManifests", () => {
  it("records timing metadata for a generated large manifest bundle", () => {
    const report = analyzeK8sManifests(generatedPerformanceManifest);

    expect(report.analysisMetadata.documentCount).toBe(640);
    expect(report.analysisMetadata.inputBytes).toBe(
      getInputSizeBytes(generatedPerformanceManifest),
    );
    expect(report.analysisMetadata.parseMs).toBeGreaterThanOrEqual(0);
    expect(report.analysisMetadata.analyzeMs).toBeGreaterThanOrEqual(0);
    expect(report.analysisMetadata.totalMs).toBeGreaterThanOrEqual(
      report.analysisMetadata.parseMs,
    );
    expect(report.resourceSummary.totalObjects).toBe(640);
  });
});
