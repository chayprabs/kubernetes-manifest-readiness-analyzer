import { describe, expect, it } from "vitest";
import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import {
  buildGoldenReportSnapshot,
  loadK8sFixture,
} from "@/lib/k8s/__tests__/fixture-loader";

describe("Kubernetes golden report snapshots", () => {
  it("keeps the clean production sample stable", () => {
    const report = analyzeK8sManifests(
      loadK8sFixture("clean-production-deployment.yaml"),
    );

    expect(buildGoldenReportSnapshot(report)).toMatchSnapshot();
  });

  it("keeps the broken production sample stable", () => {
    const report = analyzeK8sManifests(
      loadK8sFixture("missing-probes-resources.yaml"),
    );

    expect(buildGoldenReportSnapshot(report)).toMatchSnapshot();
  });

  it("keeps the security-focused sample stable", () => {
    const report = analyzeK8sManifests(
      loadK8sFixture("insecure-security-context.yaml"),
    );

    expect(buildGoldenReportSnapshot(report)).toMatchSnapshot();
  });

  it("keeps the deprecated API sample stable", () => {
    const report = analyzeK8sManifests(loadK8sFixture("deprecated-apis.yaml"), {
      kubernetesTargetVersion: "1.25",
    });

    expect(buildGoldenReportSnapshot(report)).toMatchSnapshot();
  });
});
