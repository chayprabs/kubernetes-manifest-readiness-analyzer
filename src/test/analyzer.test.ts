import { describe, expect, it } from "vitest";
import { analyzeManifestText, sampleManifest } from "@/lib/k8s/analyzer";

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
