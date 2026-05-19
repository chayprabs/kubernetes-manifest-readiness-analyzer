import { createNetpolFinding } from "@/lib/netpol-review/findings";
import type { NetpolFinding, NetpolResource } from "@/lib/netpol-review/types";

type NetpolRuleContext = {
  policies: NetpolResource[];
  workloadCount: number;
};

type NetpolRule = {
  id: string;
  title: string;
  defaultSeverity: NetpolFinding["severity"];
  run: (context: NetpolRuleContext) => NetpolFinding[];
};

function readSpec(policy: NetpolResource) {
  const record = policy.record as { spec?: Record<string, unknown> };
  return record.spec ?? {};
}

export const netpolRules: NetpolRule[] = [
  {
    id: "egress-wide-open",
    title: "Egress allows all destinations",
    defaultSeverity: "high",
    run({ policies }) {
      return policies.flatMap((policy) => {
        const egress = readSpec(policy).egress;
        if (!Array.isArray(egress)) {
          return [];
        }

        const hasOpenEgress = egress.some(
          (rule) =>
            rule !== null &&
            typeof rule === "object" &&
            Object.keys(rule as Record<string, unknown>).length === 0,
        );

        if (!hasOpenEgress) {
          return [];
        }

        return [
          createNetpolFinding({
            ruleId: "egress-wide-open",
            title: "Egress allows all destinations",
            defaultSeverity: "high",
            resourceLabel: policy.ref,
            message: `${policy.ref} includes an egress rule with no selectors, which allows all destinations.`,
            recommendation:
              "Restrict egress to explicit namespaces, pods, or CIDR blocks required by the workload.",
          }),
        ];
      });
    },
  },
  {
    id: "ingress-from-world",
    title: "Ingress allows broad CIDR ranges",
    defaultSeverity: "high",
    run({ policies }) {
      return policies.flatMap((policy) => {
        const ingress = readSpec(policy).ingress;
        if (!Array.isArray(ingress)) {
          return [];
        }

        const hasWorldCidr = ingress.some((rule) => {
          if (!rule || typeof rule !== "object") {
            return false;
          }

          const from = (rule as { from?: unknown }).from;
          if (!Array.isArray(from)) {
            return false;
          }

          return from.some((peer) => {
            const cidr = (peer as { ipBlock?: { cidr?: string } }).ipBlock?.cidr;
            return cidr === "0.0.0.0/0" || cidr === "::/0";
          });
        });

        if (!hasWorldCidr) {
          return [];
        }

        return [
          createNetpolFinding({
            ruleId: "ingress-from-world",
            title: "Ingress allows broad CIDR ranges",
            defaultSeverity: "high",
            resourceLabel: policy.ref,
            message: `${policy.ref} allows ingress from the entire internet.`,
            recommendation:
              "Tighten ipBlock CIDRs or use namespace/pod selectors for trusted callers only.",
          }),
        ];
      });
    },
  },
  {
    id: "empty-pod-selector",
    title: "NetworkPolicy selects every pod in the namespace",
    defaultSeverity: "medium",
    run({ policies }) {
      return policies.flatMap((policy) => {
        const podSelector = readSpec(policy).podSelector;
        if (
          !podSelector ||
          typeof podSelector !== "object" ||
          Object.keys(podSelector as Record<string, unknown>).length !== 0
        ) {
          return [];
        }

        return [
          createNetpolFinding({
            ruleId: "empty-pod-selector",
            title: "NetworkPolicy selects every pod in the namespace",
            defaultSeverity: "medium",
            resourceLabel: policy.ref,
            message: `${policy.ref} uses an empty podSelector, which matches all pods in the namespace.`,
            recommendation:
              "Scope podSelector to the workload labels you intend to protect.",
          }),
        ];
      });
    },
  },
  {
    id: "missing-policy-types",
    title: "NetworkPolicy missing policyTypes",
    defaultSeverity: "low",
    run({ policies }) {
      return policies.flatMap((policy) => {
        const policyTypes = readSpec(policy).policyTypes;
        if (Array.isArray(policyTypes) && policyTypes.length > 0) {
          return [];
        }

        return [
          createNetpolFinding({
            ruleId: "missing-policy-types",
            title: "NetworkPolicy missing policyTypes",
            defaultSeverity: "low",
            resourceLabel: policy.ref,
            message: `${policy.ref} does not declare policyTypes for ingress and egress behavior.`,
            recommendation:
              "Set policyTypes explicitly so Kubernetes applies the intended directionality.",
          }),
        ];
      });
    },
  },
  {
    id: "namespace-without-deny",
    title: "Workloads present without a default-deny policy",
    defaultSeverity: "info",
    run({ policies, workloadCount }) {
      if (workloadCount === 0 || policies.length === 0) {
        return [];
      }

      const hasDefaultDeny = policies.some((policy) => {
        const spec = readSpec(policy);
        const types = spec.policyTypes;
        const ingress = Array.isArray(spec.ingress) ? spec.ingress : [];
        const podSelector = spec.podSelector;
        const selectsAll =
          podSelector &&
          typeof podSelector === "object" &&
          Object.keys(podSelector as Record<string, unknown>).length === 0;

        return (
          selectsAll &&
          Array.isArray(types) &&
          types.includes("Ingress") &&
          ingress.length === 0
        );
      });

      if (hasDefaultDeny) {
        return [];
      }

      return [
        createNetpolFinding({
          ruleId: "namespace-without-deny",
          title: "Workloads present without a default-deny policy",
          defaultSeverity: "info",
          resourceLabel: "bundle",
          message:
            "This manifest bundle includes workloads but no default-deny NetworkPolicy for the namespace.",
          recommendation:
            "Consider adding a deny-all policy plus explicit allow policies for required traffic.",
        }),
      ];
    },
  },
];
