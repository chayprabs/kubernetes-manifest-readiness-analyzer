import { describe, expect, it } from "vitest";
import {
  createK8sAnalyticsPayloadInputFromReport,
  getAnalyticsDurationBucket,
  getAnalyticsInputSizeBucket,
  sanitizeAnalyticsEvent,
  sanitizeClientErrorReport,
} from "@/lib/analytics/events";
import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import { loadK8sFixture } from "@/lib/k8s/__tests__/fixture-loader";

describe("analytics event sanitization", () => {
  it("keeps only the safe allowlisted event fields and buckets exact values", () => {
    const event = sanitizeAnalyticsEvent("analysis_completed", {
      toolId: "kubernetes-manifest-analyzer",
      profile: "balanced",
      kubernetesVersion: "1.32",
      inputSizeBytes: 8 * 1024,
      documentCount: 3,
      severityCounts: {
        critical: 1,
        high: 2,
        medium: 0,
        low: 4,
        info: 6,
        custom: 999,
      },
      categoryCounts: {
        reliability: 2,
        security: 1,
        schema: 1,
        invented: 999,
      },
      analysisDurationMs: 420,
      browserLocale: "en-US",
      rawYaml: "apiVersion: v1",
      namespace: "payments",
      resourceName: "checkout-api",
      findingMessage: "Container \"alice\" uses a secret",
      annotations: {
        owner: "alice@example.com",
      },
    });

    expect(event).toEqual({
      name: "analysis_completed",
      payload: {
        toolId: "kubernetes-manifest-analyzer",
        profile: "balanced",
        kubernetesVersion: "1.32",
        inputSizeBucket: "4kb-32kb",
        documentCount: 3,
        severityCounts: {
          critical: 1,
          high: 2,
          medium: 0,
          low: 4,
          info: 6,
        },
        categoryCounts: {
          reliability: 2,
          security: 1,
          schema: 1,
        },
        analysisDurationBucket: "100ms-500ms",
        browserLocale: "en-US",
      },
    });
  });

  it("rejects events when the required tool id is unsafe or invalid", () => {
    expect(
      sanitizeAnalyticsEvent("tool_viewed", {
        toolId: "kind: Secret\ndata:\n  token: ghp_secret",
      }),
    ).toBeNull();
  });

  it("creates report payload inputs without exposing raw manifests or finding text", () => {
    const report = analyzeK8sManifests(
      loadK8sFixture("missing-probes-resources.yaml"),
    );

    expect(
      createK8sAnalyticsPayloadInputFromReport({
        toolId: "kubernetes-manifest-analyzer",
        report,
        browserLocale: "en-US",
      }),
    ).toEqual({
      toolId: "kubernetes-manifest-analyzer",
      profile: report.profile.id,
      kubernetesVersion: report.options.kubernetesTargetVersion,
      inputSizeBytes: report.analysisMetadata.inputBytes,
      documentCount: report.analysisMetadata.documentCount,
      severityCounts: report.severityCounts,
      categoryCounts: report.categoryCounts,
      analysisDurationMs: report.analysisMetadata.totalMs,
      browserLocale: "en-US",
    });
  });

  it("sanitizes client error reports into coarse categories only", () => {
    const error = new Error(
      'ChunkLoadError: failed to fetch dynamically imported module "apiVersion: v1 kind: Secret"',
    );

    expect(
      sanitizeClientErrorReport(error, {
        route: "/tools/kubernetes-manifest-analyzer",
        toolId: "kubernetes-manifest-analyzer",
        browserLocale: "en-US",
        digest: "abc12345",
      }),
    ).toEqual({
      name: "Error",
      category: "chunk-load",
      route: "/tools/kubernetes-manifest-analyzer",
      toolId: "kubernetes-manifest-analyzer",
      browserLocale: "en-US",
      digest: "abc12345",
    });
  });

  it("maps exact size and duration values into buckets", () => {
    expect(getAnalyticsInputSizeBucket(0)).toBe("empty");
    expect(getAnalyticsInputSizeBucket(1024)).toBe("lt-4kb");
    expect(getAnalyticsInputSizeBucket(100 * 1024)).toBe("32kb-128kb");
    expect(getAnalyticsDurationBucket(50)).toBe("lt-100ms");
    expect(getAnalyticsDurationBucket(800)).toBe("500ms-1s");
    expect(getAnalyticsDurationBucket(15000)).toBe("gt-10s");
  });
});
