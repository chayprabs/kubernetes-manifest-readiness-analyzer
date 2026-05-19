import { describe, expect, it } from "vitest";
import { analyzeNetworkPolicies } from "@/lib/netpol-review/analyzer";

const permissivePolicy = `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all-egress
  namespace: apps
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - {}
`;

describe("analyzeNetworkPolicies", () => {
  it("flags wide open egress", () => {
    const report = analyzeNetworkPolicies(permissivePolicy);
    expect(report.findings.map((finding) => finding.ruleId)).toContain(
      "egress-wide-open",
    );
  });
});
