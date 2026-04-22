import { describe, expect, it } from "vitest";
import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import { securityK8sRules } from "@/lib/k8s/rules";
import {
  allowPrivilegeEscalationMissingDeployment,
  allowPrivilegeEscalationTrueDeployment,
  automountDefaultServiceAccountDeployment,
  dangerousCapabilitiesDeployment,
  hostNamespaceDeployment,
  hostPathDeployment,
  intentionalApiAccessManifest,
  literalSecretManifest,
  literalSensitiveEnvDeployment,
  missingSeccompDeployment,
  namespaceWithoutPodSecurity,
  privilegedDeployment,
  readOnlyRootFilesystemMissingDeployment,
  rootByDefaultDeployment,
  runAsUserRootDeployment,
  secureDeployment,
} from "@/lib/k8s/__tests__/fixtures/security.fixtures";

function analyzeSecurityManifest(
  manifest: string,
  options: Parameters<typeof analyzeK8sManifests>[1] = {},
) {
  return analyzeK8sManifests(manifest, {
    ...options,
    rules: securityK8sRules,
  });
}

function findingsByRuleId(manifest: string, ruleId: string) {
  return analyzeSecurityManifest(manifest).findings.filter(
    (finding) => finding.ruleId === ruleId,
  );
}

describe("Kubernetes security rules", () => {
  it("flags privileged containers and escalates them in the security profile", () => {
    const balanced = findingsByRuleId(privilegedDeployment, "privileged-container");
    const security = analyzeSecurityManifest(privilegedDeployment, {
      profile: "security",
    }).findings.filter((finding) => finding.ruleId === "privileged-container");

    expect(balanced).toHaveLength(1);
    expect(balanced[0]).toMatchObject({
      severity: "high",
      whyItMatters: expect.stringContaining("blast radius"),
    });
    expect(security[0]?.severity).toBe("critical");
  });

  it("does not raise the baseline security warnings for an already hardened Deployment", () => {
    const report = analyzeSecurityManifest(secureDeployment);

    expect(report.findings).toEqual([]);
  });

  it("detects runAsUser: 0", () => {
    const findings = findingsByRuleId(
      runAsUserRootDeployment,
      "run-as-user-root",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "high",
      recommendation: expect.stringContaining("non-zero"),
    });
  });

  it("detects dangerous capabilities and missing drop ALL", () => {
    const report = analyzeSecurityManifest(dangerousCapabilitiesDeployment);
    const ruleIds = report.findings.map((finding) => finding.ruleId);

    expect(ruleIds).toContain("dangerous-capabilities-added");
    expect(ruleIds).toContain("capabilities-not-dropping-all");
    expect(
      report.findings.find(
        (finding) => finding.ruleId === "dangerous-capabilities-added",
      ),
    ).toMatchObject({
      severity: "high",
      message: expect.stringContaining("SYS_ADMIN"),
    });
  });

  it("detects hostPath usage and explains the node-access risk", () => {
    const findings = findingsByRuleId(hostPathDeployment, "hostpath-volume-usage");

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "high",
      whyItMatters: expect.stringContaining("node"),
      message: expect.stringContaining("/var/run/docker.sock"),
    });
  });

  it("detects host namespace sharing", () => {
    const findings = findingsByRuleId(
      hostNamespaceDeployment,
      "host-namespace-sharing",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("hostNetwork");
  });

  it("gives different severities for explicit and missing allowPrivilegeEscalation across profiles", () => {
    const balancedTrue = findingsByRuleId(
      allowPrivilegeEscalationTrueDeployment,
      "allow-privilege-escalation",
    );
    const securityTrue = analyzeSecurityManifest(
      allowPrivilegeEscalationTrueDeployment,
      {
        profile: "security",
      },
    ).findings.filter(
      (finding) => finding.ruleId === "allow-privilege-escalation",
    );

    const balancedMissing = findingsByRuleId(
      allowPrivilegeEscalationMissingDeployment,
      "allow-privilege-escalation",
    );
    const securityMissing = analyzeSecurityManifest(
      allowPrivilegeEscalationMissingDeployment,
      {
        profile: "security",
      },
    ).findings.filter(
      (finding) => finding.ruleId === "allow-privilege-escalation",
    );

    expect(balancedTrue[0]?.severity).toBe("medium");
    expect(securityTrue[0]?.severity).toBe("high");
    expect(balancedMissing[0]?.severity).toBe("low");
    expect(securityMissing[0]?.severity).toBe("medium");
  });

  it("warns when seccomp is missing and prefers RuntimeDefault", () => {
    const findings = findingsByRuleId(
      missingSeccompDeployment,
      "missing-seccomp-profile",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      recommendation: expect.stringContaining("RuntimeDefault"),
      fix: {
        snippet: expect.stringContaining("seccompProfile"),
      },
    });
  });

  it("warns when readOnlyRootFilesystem is missing and gets stricter in the security profile", () => {
    const balanced = findingsByRuleId(
      readOnlyRootFilesystemMissingDeployment,
      "read-only-root-filesystem",
    );
    const security = analyzeSecurityManifest(
      readOnlyRootFilesystemMissingDeployment,
      {
        profile: "security",
      },
    ).findings.filter(
      (finding) => finding.ruleId === "read-only-root-filesystem",
    );

    expect(balanced[0]?.severity).toBe("low");
    expect(security[0]?.severity).toBe("medium");
  });

  it("warns about token mounting and default ServiceAccount usage for production-style workloads", () => {
    const report = analyzeSecurityManifest(
      automountDefaultServiceAccountDeployment,
    );
    const ruleIds = report.findings.map((finding) => finding.ruleId);

    expect(ruleIds).toContain("automount-service-account-token");
    expect(ruleIds).toContain("default-serviceaccount-usage");
  });

  it("suppresses the automount warning when ServiceAccount or RBAC resources suggest API access is intentional", () => {
    const report = analyzeSecurityManifest(intentionalApiAccessManifest);

    expect(
      report.findings.some(
        (finding) => finding.ruleId === "automount-service-account-token",
      ),
    ).toBe(false);
    expect(
      report.findings.some(
        (finding) => finding.ruleId === "default-serviceaccount-usage",
      ),
    ).toBe(false);
  });

  it("warns when sensitive environment variables use literal values and never prints the value", () => {
    const report = analyzeSecurityManifest(literalSensitiveEnvDeployment);
    const serializedFindings = JSON.stringify(report.findings);

    expect(
      report.findings.find(
        (finding) => finding.ruleId === "literal-sensitive-env-var",
      ),
    ).toMatchObject({
      recommendation: expect.stringContaining("secretKeyRef"),
    });
    expect(serializedFindings).not.toContain("super-secret-password-123");
  });

  it("warns on Secret data without printing secret values", () => {
    const report = analyzeSecurityManifest(literalSecretManifest);
    const serializedFindings = JSON.stringify(report.findings);

    expect(
      report.findings.find(
        (finding) => finding.ruleId === "literal-secret-values",
      ),
    ).toMatchObject({
      message: expect.stringContaining("intentionally does not display secret values"),
    });
    expect(serializedFindings).not.toContain("dont-print-me");
    expect(serializedFindings).not.toContain("also-do-not-print");
  });

  it("surfaces the heuristic root-by-default warning with medium confidence", () => {
    const findings = findingsByRuleId(
      rootByDefaultDeployment,
      "container-may-run-as-root-by-default",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.confidence).toBe("medium");
  });

  it("reports missing pod-security namespace labels when info findings are included", () => {
    const report = analyzeSecurityManifest(namespaceWithoutPodSecurity, {
      includeInfoFindings: true,
    });

    expect(
      report.findings.find(
        (finding) =>
          finding.ruleId === "namespace-missing-pod-security-enforce",
      ),
    ).toMatchObject({
      severity: "info",
    });
  });
});
