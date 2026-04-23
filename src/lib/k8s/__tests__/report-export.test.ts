import { describe, expect, it } from "vitest";
import { analyzeK8sManifests, sampleBrokenManifest } from "@/lib/k8s/analyzer";
import { createFinding } from "@/lib/k8s/findings";
import {
  buildK8sCsvFindingsExport,
  buildK8sJsonExport,
  buildK8sJsonExportObject,
  buildK8sMarkdownExport,
} from "@/lib/k8s/report-export";
import type { K8sAnalysisReport } from "@/lib/k8s/types";
import {
  literalSecretManifest,
  literalSensitiveEnvDeployment,
} from "@/lib/k8s/__tests__/fixtures/security.fixtures";

const fixedTimestamp = "2026-04-23T02:30:00.000Z";

describe("Kubernetes report exports", () => {
  it("keeps the PR-ready Markdown export stable for a broken manifest sample", () => {
    const report = analyzeK8sManifests(sampleBrokenManifest, {
      kubernetesTargetVersion: "1.30",
    });

    expect(
      normalizeTiming(
        buildK8sMarkdownExport(report, {
          generatedAt: fixedTimestamp,
        }),
      ),
    ).toMatchInlineSnapshot(`
      "# Kubernetes Manifest Review

      Generated locally in browser on 2026-04-23 02:30:00 UTC.
      Static manifest review only. This is not a live cluster audit.

      ## Summary

      - Score: 34/100
      - Grade: Not production ready
      - Risk level: Critical
      - Kubernetes target: 1.30
      - Profile: Balanced
      - Objects analyzed: 1
      - Analysis time: <timing>
      - Findings: 19
      - Generated timestamp: 2026-04-23 02:30:00 UTC

      > Not production ready: high-risk issues need review

      Score 34/100 after reviewing 1 object across 1 namespace. 1 blocking issue and 18 additional warnings were found.

      ## Severity Counts

      | Critical | High | Medium | Low | Info |
      | --- | --- | --- | --- | --- |
      | 0 | 1 | 8 | 10 | 0 |

      ## Fix First

      1. **Missing readiness probe** on \`Deployment/authos-demo (default)\`
      2. **Deployment rollout availability risk** on \`Deployment/authos-demo (default)\`
      3. **Missing liveness probe** on \`Deployment/authos-demo (default)\`

      ## Top Findings

      Showing 19 of 19 findings.

      1. **[HIGH] Missing readiness probe**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: reliability
         - Finding: Container "api" in Deployment "authos-demo" does not define a readinessProbe.
         - Recommendation: Add a readinessProbe for this container. Use the template below as a starting point and adjust the path, port, and timing to match the application.
         - Suggested fix: Add a readiness probe template

      2. **[MEDIUM] Deployment rollout availability risk**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: reliability
         - Finding: Deployment "authos-demo" rolls only 1 replica, so a rollout has no spare serving capacity if the replacement pod starts slowly or fails readiness.
         - Recommendation: Increase replicas to at least 2 and keep maxUnavailable at 0 for small Deployments that need to stay online during rollouts.
         - Suggested fix: Keep zero planned unavailability during rollout and add replica headroom.

      3. **[MEDIUM] Missing liveness probe**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: reliability
         - Finding: Container "api" in Deployment "authos-demo" does not define a livenessProbe.
         - Recommendation: Add a livenessProbe that reflects real stuck-process behavior. Use the template below as a starting point and adjust the path, port, and timing to match the application.
         - Suggested fix: Add a liveness probe template

      4. **[MEDIUM] Missing resource limits**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: reliability
         - Finding: Container "api" in Deployment "authos-demo" is missing both memory and CPU limits.
         - Recommendation: Add a memory limit and decide explicitly whether a CPU limit is appropriate for this workload. The example below is only a placeholder and must be tuned.
         - Suggested fix: Add resource requests and limits

      5. **[MEDIUM] Missing resource requests**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: reliability
         - Finding: Container "api" in Deployment "authos-demo" is missing cpu and memory requests.
         - Recommendation: Set CPU and memory requests for this container using measured usage as a starting point. The example below is a placeholder, not a universal production value.
         - Suggested fix: Add resource requests and limits

      6. **[MEDIUM] Mutable image tag**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: reliability
         - Finding: Container "api" in Deployment "authos-demo" uses image "ghcr.io/authos/demo:latest" with the mutable ":latest" tag.
         - Recommendation: Pin the image to an explicit version tag or, better, an image digest so deployments stay reproducible.
         - Suggested fix: Pin the image to an immutable tag or digest

      7. **[MEDIUM] Missing seccomp profile**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: security
         - Finding: Container "api" in Deployment "authos-demo" does not set a seccomp profile.
         - Recommendation: Set seccompProfile.type: RuntimeDefault unless the app has a reviewed need for a custom profile.
         - Suggested fix: Add a reviewed securityContext baseline

      8. **[MEDIUM] runAsNonRoot should be true**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: security
         - Finding: Container "api" in Deployment "authos-demo" does not set runAsNonRoot: true at the pod or container level.
         - Recommendation: Set runAsNonRoot: true at pod level when possible so every container inherits the safer default.
         - Suggested fix: Add a reviewed securityContext baseline

      9. **[MEDIUM] Missing recommended app labels**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: best-practice
         - Finding: Deployment "authos-demo" is missing recommended app labels: app.kubernetes.io/name, app.kubernetes.io/instance, app.kubernetes.io/component, app.kubernetes.io/part-of, app.kubernetes.io/managed-by.
         - Recommendation: Add the standard app.kubernetes.io labels with values that reflect the app name, instance, component, broader system, and deployment manager.
         - Suggested fix: Add the recommended app.kubernetes.io labels with real values for this resource.

      10. **[LOW] Single replica Deployment**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: reliability
         - Finding: Deployment "authos-demo" is configured with 1 replica.
         - Recommendation: Set this Deployment to at least 2 replicas for production-style availability, then confirm the workload and dependencies can support the extra copies.
         - Suggested fix: Scale the Deployment to 2 replicas

      11. **[LOW] allowPrivilegeEscalation should be false**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: security
         - Finding: Container "api" in Deployment "authos-demo" does not set allowPrivilegeEscalation: false.
         - Recommendation: Set allowPrivilegeEscalation: false unless the application has a reviewed need for it.
         - Suggested fix: Add a reviewed securityContext baseline

      12. **[LOW] automountServiceAccountToken should usually be false**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: security
         - Finding: Deployment "authos-demo" does not set automountServiceAccountToken: false.
         - Recommendation: Set automountServiceAccountToken: false unless the workload has a reviewed reason to call the Kubernetes API.
         - Suggested fix: Disable automatic service account token mounting for app workloads that do not need cluster API access.

      13. **[LOW] Capabilities should drop ALL by default**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: security
         - Finding: Container "api" in Deployment "authos-demo" does not drop all capabilities before adding exceptions.
         - Recommendation: Start from capabilities.drop: ["ALL"] and then add back only the minimum reviewed capabilities if the app truly requires them.
         - Suggested fix: Add a reviewed securityContext baseline

      14. **[LOW] Container may run as root by default**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: security
         - Finding: Container "api" in Deployment "authos-demo" does not set runAsNonRoot or runAsUser, so the image could still start as root by default.
         - Recommendation: Set runAsNonRoot: true explicitly and, when needed, choose a reviewed non-zero UID for the container.
         - Suggested fix: Add a reviewed securityContext baseline

      15. **[LOW] Production workload uses the default ServiceAccount**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: security
         - Finding: Deployment "authos-demo" uses the default ServiceAccount with its token mount still enabled.
         - Recommendation: Use a dedicated ServiceAccount for workloads that need cluster API access, and disable token mounting when they do not.
         - Suggested fix: Move the workload off the default ServiceAccount and disable token mounting if the API is unnecessary.

      16. **[LOW] readOnlyRootFilesystem should be true**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: security
         - Finding: Container "api" in Deployment "authos-demo" does not set readOnlyRootFilesystem: true.
         - Recommendation: Set readOnlyRootFilesystem: true if the app can run from mounted writable paths such as emptyDir, PVCs, or dedicated cache directories.
         - Suggested fix: Add a reviewed securityContext baseline

      17. **[LOW] Namespace has no NetworkPolicy**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: networking
         - Finding: Namespace "default" has application workloads but no NetworkPolicy resources in the manifest set.
         - Recommendation: Add at least a reviewed baseline NetworkPolicy for this namespace. A default-deny policy is a careful rollout item that usually needs explicit allow rules alongside it.
         - Suggested fix: Start with a minimal default-deny policy and stage explicit allow rules carefully.

      18. **[LOW] Missing owner or team metadata**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: operations
         - Finding: Deployment "authos-demo" does not include obvious owner or team labels/annotations.
         - Recommendation: Add a team label and owner annotation that match how your organization routes operational responsibility.
         - Suggested fix: Attach simple owner/team metadata so responders can find the responsible team quickly.

      19. **[LOW] Namespaced resource omits metadata.namespace**
         - Resource: \`Deployment/authos-demo (default)\`
         - Category: operations
         - Finding: Deployment "authos-demo" does not set metadata.namespace and will rely on the default namespace at apply time.
         - Recommendation: Set metadata.namespace explicitly for namespaced resources so the manifest states its intended destination clearly.
         - Suggested fix: Add an explicit namespace instead of relying on the kubectl default.

      ## Review Notes

      - Next step: Fix first: Missing readiness probe; Deployment rollout availability risk; Missing liveness probe. After those are resolved, review the lower-severity findings before shipping.
      - Share safety: No secret-like values were detected in findings.
      "
    `);
  });

  it("never includes secret values in privacy-safe exports", () => {
    const envReport = analyzeK8sManifests(literalSensitiveEnvDeployment);
    const secretReport = analyzeK8sManifests(literalSecretManifest);

    const rendered = [
      buildK8sMarkdownExport(envReport, { generatedAt: fixedTimestamp }),
      buildK8sMarkdownExport(secretReport, { generatedAt: fixedTimestamp }),
      buildK8sJsonExport(envReport, { generatedAt: fixedTimestamp }),
      buildK8sJsonExport(secretReport, { generatedAt: fixedTimestamp }),
      buildK8sCsvFindingsExport(envReport),
      buildK8sCsvFindingsExport(secretReport),
    ].join("\n");

    expect(rendered).not.toContain("super-secret-password-123");
    expect(rendered).not.toContain("dont-print-me");
    expect(rendered).not.toContain("also-do-not-print");
  });

  it("excludes raw input from JSON exports by default", () => {
    const report = analyzeK8sManifests(literalSensitiveEnvDeployment);
    const exported = buildK8sJsonExportObject(report, {
      generatedAt: fixedTimestamp,
    });
    const serialized = JSON.stringify(exported);

    expect(serialized).not.toContain(literalSensitiveEnvDeployment);
    expect(serialized).not.toContain("super-secret-password-123");
    expect(exported.exportMetadata.includesRawInput).toBe(false);
    expect(exported.exportMetadata.redactedByDefault).toBe(true);
    expect("rawInput" in exported.report).toBe(false);
    expect(exported.report.analysisMetadata.documentCount).toBe(
      report.analysisMetadata.documentCount,
    );
  });

  it("keeps included manifest content redacted by default", () => {
    const exported = buildK8sJsonExport(
      analyzeK8sManifests(literalSecretManifest),
      {
        generatedAt: fixedTimestamp,
        includeRawInput: true,
      },
    );

    expect(exported).toContain("[REDACTED SECRET]");
    expect(exported).not.toContain("dont-print-me");
    expect(exported).not.toContain("also-do-not-print");
  });

  it("escapes commas and newlines in CSV exports", () => {
    const baseReport = analyzeK8sManifests(sampleBrokenManifest);
    const resourceRef = baseReport.findings[0]?.resourceRef ?? {
      documentIndex: 0,
      apiVersion: "apps/v1",
      kind: "Deployment",
      name: "demo",
      namespace: "apps",
    };
    const csvReport: K8sAnalysisReport = {
      ...baseReport,
      findings: [
        createFinding({
          id: "csv:1",
          ruleId: "csv-test",
          title: "Comma, newline title",
          message: "CSV coverage",
          severity: "medium",
          category: "operations",
          resourceRef,
          whyItMatters: "CSV coverage",
          recommendation: "Line one,\nline two",
        }),
      ],
    };

    expect(buildK8sCsvFindingsExport(csvReport)).toBe(
      [
        `"severity","category","resource","title","recommendation"`,
        `"medium","operations","Deployment/authos-demo (default)","Comma, newline title","Line one,`,
        `line two"`,
      ].join("\n"),
    );
  });
});

function normalizeTiming(value: string) {
  return value.replace(/- Analysis time: .+/u, "- Analysis time: <timing>");
}
