import { describe, expect, it } from "vitest";
import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import { buildVisibleK8sReportJson } from "@/lib/k8s/privacy";
import {
  literalSecretManifest,
  literalSensitiveEnvDeployment,
} from "@/lib/k8s/__tests__/fixtures/security.fixtures";

describe("Kubernetes privacy safeguards", () => {
  it("marks Secret manifests as sensitive and redacts the visible report JSON", () => {
    const report = analyzeK8sManifests(literalSecretManifest);
    const visibleJson = buildVisibleK8sReportJson(report);

    expect(report.privacy.sensitiveDataDetected).toBe(true);
    expect(report.privacy.detectedKinds).toEqual(
      expect.arrayContaining(["secret-data"]),
    );
    expect(report.canShareReportSafely).toBe(false);
    expect(visibleJson).not.toContain("dont-print-me");
    expect(visibleJson).not.toContain("also-do-not-print");
  });

  it("tracks literal sensitive env vars in the privacy summary", () => {
    const report = analyzeK8sManifests(literalSensitiveEnvDeployment);

    expect(report.privacy.sensitiveDataDetected).toBe(true);
    expect(report.privacy.detectedKinds).toContain("sensitive-env-var");
  });
});
