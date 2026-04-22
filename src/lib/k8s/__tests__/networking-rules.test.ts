import { describe, expect, it } from "vitest";
import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import { networkingK8sRules } from "@/lib/k8s/rules";
import {
  defaultDenyPolicyManifest,
  duplicateServicePortsManifest,
  externalNameServiceManifest,
  ingressBroadHostManifest,
  ingressMissingServiceManifest,
  ingressWithoutTlsManifest,
  loadBalancerServiceManifest,
  multiPortUnnamedServiceManifest,
  networkPolicyAbsentManifest,
  networkPolicySelectorMatchesNothingManifest,
  nodePortServiceManifest,
  serviceMatchesDeploymentManifest,
  serviceNumericPortMismatchManifest,
  serviceSelectorBroadManifest,
  serviceSelectorNoMatchManifest,
  serviceTargetPortNamedPortMissingManifest,
} from "@/lib/k8s/__tests__/fixtures/networking.fixtures";

function analyzeNetworkingManifest(
  manifest: string,
  options: Parameters<typeof analyzeK8sManifests>[1] = {},
) {
  return analyzeK8sManifests(manifest, {
    ...options,
    rules: networkingK8sRules,
  });
}

function findingsByRuleId(manifest: string, ruleId: string) {
  return analyzeNetworkingManifest(manifest).findings.filter(
    (finding) => finding.ruleId === ruleId,
  );
}

describe("Kubernetes networking rules", () => {
  it("flags Services whose selectors match no workloads and explains the selector problem", () => {
    const findings = findingsByRuleId(
      serviceSelectorNoMatchManifest,
      "service-selector-matches-nothing",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "high",
      message: expect.stringContaining('selector "app=api"'),
      recommendation: expect.stringContaining("Confirm the Service namespace"),
    });
  });

  it("does not flag the no-match rule when a Service selects the intended Deployment", () => {
    const report = analyzeNetworkingManifest(serviceMatchesDeploymentManifest);

    expect(
      report.findings.some(
        (finding) => finding.ruleId === "service-selector-matches-nothing",
      ),
    ).toBe(false);
    expect(
      report.findings.some(
        (finding) =>
          finding.ruleId ===
          "service-targetport-named-port-missing",
      ),
    ).toBe(false);
  });

  it("warns when a selector is broad enough to span multiple unrelated workloads", () => {
    const findings = findingsByRuleId(
      serviceSelectorBroadManifest,
      "service-selector-matches-multiple-unrelated-workloads",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("orders");
    expect(findings[0]?.message).toContain("payments");
  });

  it("warns when Service targetPort names do not exist on matched workloads", () => {
    const findings = findingsByRuleId(
      serviceTargetPortNamedPortMissingManifest,
      "service-targetport-named-port-missing",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "medium",
      message: expect.stringContaining('targetPort "http"'),
    });
  });

  it("warns when a numeric Service targetPort has no matching declared containerPort", () => {
    const findings = findingsByRuleId(
      serviceNumericPortMismatchManifest,
      "service-port-missing-container-port",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("9090");
  });

  it("warns on LoadBalancer and NodePort exposure, and raises the security profile severity", () => {
    const loadBalancerBalanced = findingsByRuleId(
      loadBalancerServiceManifest,
      "loadbalancer-exposure",
    );
    const loadBalancerSecurity = analyzeNetworkingManifest(
      loadBalancerServiceManifest,
      {
        profile: "security",
      },
    ).findings.filter((finding) => finding.ruleId === "loadbalancer-exposure");
    const nodePortSecurity = analyzeNetworkingManifest(nodePortServiceManifest, {
      profile: "security",
    }).findings.filter((finding) => finding.ruleId === "nodeport-exposure");

    expect(loadBalancerBalanced[0]?.severity).toBe("medium");
    expect(loadBalancerSecurity[0]?.severity).toBe("high");
    expect(nodePortSecurity[0]?.severity).toBe("high");
  });

  it("flags Ingresses without TLS and escalates the severity in strict mode", () => {
    const balanced = findingsByRuleId(
      ingressWithoutTlsManifest,
      "ingress-without-tls",
    );
    const strict = analyzeNetworkingManifest(ingressWithoutTlsManifest, {
      profile: "strict",
    }).findings.filter((finding) => finding.ruleId === "ingress-without-tls");

    expect(balanced).toHaveLength(1);
    expect(balanced[0]).toMatchObject({
      severity: "medium",
      fix: {
        snippet: expect.stringContaining("secretName"),
      },
    });
    expect(strict[0]?.severity).toBe("high");
  });

  it("flags overly broad Ingress hosts and missing backend Services", () => {
    const broadHost = findingsByRuleId(
      ingressBroadHostManifest,
      "ingress-broad-host",
    );
    const missingBackend = findingsByRuleId(
      ingressMissingServiceManifest,
      "ingress-backend-service-missing",
    );

    expect(broadHost).toHaveLength(1);
    expect(broadHost[0]?.message).toContain("*.example.com");
    expect(missingBackend).toHaveLength(1);
    expect(missingBackend[0]?.message).toContain('Service "web"');
  });

  it("flags NetworkPolicies whose podSelector matches nothing", () => {
    const findings = findingsByRuleId(
      networkPolicySelectorMatchesNothingManifest,
      "networkpolicy-selector-matches-nothing",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "medium",
      message: expect.stringContaining("app=web"),
    });
  });

  it("warns when a namespace has app workloads but no NetworkPolicy, and detects default-deny baselines positively", () => {
    const balancedAbsence = findingsByRuleId(
      networkPolicyAbsentManifest,
      "networkpolicy-absent-for-namespace",
    );
    const strictAbsence = analyzeNetworkingManifest(networkPolicyAbsentManifest, {
      profile: "strict",
    }).findings.filter(
      (finding) => finding.ruleId === "networkpolicy-absent-for-namespace",
    );
    const defaultDeny = analyzeNetworkingManifest(defaultDenyPolicyManifest, {
      includeInfoFindings: true,
    }).findings.filter(
      (finding) => finding.ruleId === "default-deny-networkpolicy-detected",
    );

    expect(balancedAbsence[0]).toMatchObject({
      severity: "low",
      fix: {
        snippet: expect.stringContaining("default-deny"),
      },
    });
    expect(strictAbsence[0]?.severity).toBe("medium");
    expect(defaultDeny).toHaveLength(1);
    expect(defaultDeny[0]?.message).toContain("default-deny behavior");
  });

  it("warns on ExternalName Services plus multi-port naming and duplicate Service ports", () => {
    expect(
      findingsByRuleId(externalNameServiceManifest, "externalname-service"),
    ).toHaveLength(1);
    expect(
      findingsByRuleId(
        multiPortUnnamedServiceManifest,
        "service-multiport-names-missing",
      ),
    ).toHaveLength(1);
    expect(
      findingsByRuleId(duplicateServicePortsManifest, "service-duplicate-ports"),
    ).toHaveLength(1);
  });
});
