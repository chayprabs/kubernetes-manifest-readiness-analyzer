import type { K8sRule } from "@/lib/k8s/types";
import {
  buildDefaultDenySnippet,
  createDocumentFinding,
  createResourceFinding,
  formatHumanList,
  getMatchedWorkloadsForNetworkPolicy,
  getNamespaceNetworkPolicies,
  getNamespaceWorkloads,
  isDefaultDenyPolicy,
  isStrictOrSecurityProfile,
  selectorToString,
} from "@/lib/k8s/rules/networking/shared";

export const networkPolicyAbsentForNamespaceRule: K8sRule = {
  id: "networkpolicy-absent-for-namespace",
  title: "Namespace has no NetworkPolicy",
  description:
    "Without any NetworkPolicy in a namespace, pod-to-pod traffic controls are left to the cluster default behavior and CNI implementation.",
  category: "networking",
  defaultSeverity: "low",
  run(context) {
    const namespaces = new Set(
      getNamespacesWithAppWorkloads(context).filter(
        (value) => value !== undefined,
      ),
    );

    return [...namespaces].flatMap((namespace) => {
      if (getNamespaceNetworkPolicies(context, namespace).length > 0) {
        return [];
      }

      const workloads = getNamespaceWorkloads(context, namespace);
      const namespaceDocument = context.documents.find(
        (document) =>
          document.kind === "Namespace" && document.metadata.name === namespace,
      );
      const severity = isStrictOrSecurityProfile(context) ? "medium" : "low";

      if (namespaceDocument) {
        return [
          createDocumentFinding(context, namespaceDocument, {
            ruleId: this.id,
            idSuffix: namespace,
            title: this.title,
            message: `Namespace "${namespace}" has application workloads but no NetworkPolicy resources in the manifest set.`,
            severity,
            category: this.category,
            path: "metadata.name",
            whyItMatters:
              "Without NetworkPolicy objects, lateral traffic rules remain implicit, and the exact behavior can vary by CNI and cluster defaults.",
            recommendation:
              "Add at least a reviewed baseline NetworkPolicy for this namespace. A default-deny policy is a careful rollout item that usually needs explicit allow rules alongside it.",
            fix: {
              summary:
                "Start with a minimal default-deny policy and stage explicit allow rules carefully.",
              yamlPath: "metadata.name",
              snippet: buildDefaultDenySnippet(namespace),
            },
          }),
        ];
      }

      const workload = workloads[0];

      return workload
        ? [
            createResourceFinding(context, workload, {
              ruleId: this.id,
              idSuffix: namespace,
              title: this.title,
              message: `Namespace "${namespace}" has application workloads but no NetworkPolicy resources in the manifest set.`,
              severity,
              category: this.category,
              path: "spec",
              whyItMatters:
                "Without NetworkPolicy objects, lateral traffic rules remain implicit, and the exact behavior can vary by CNI and cluster defaults.",
              recommendation:
                "Add at least a reviewed baseline NetworkPolicy for this namespace. A default-deny policy is a careful rollout item that usually needs explicit allow rules alongside it.",
              fix: {
                summary:
                  "Start with a minimal default-deny policy and stage explicit allow rules carefully.",
                yamlPath: "spec",
                snippet: buildDefaultDenySnippet(namespace),
              },
            }),
          ]
        : [];
    });
  },
};

export const networkPolicySelectorMatchesNothingRule: K8sRule = {
  id: "networkpolicy-selector-matches-nothing",
  title: "NetworkPolicy selector matches no workloads",
  description:
    "A NetworkPolicy that selects nothing will not protect or allow traffic for the workloads you probably intended.",
  category: "networking",
  defaultSeverity: "medium",
  run(context) {
    return context.networkPolicies.flatMap((policy) => {
      const namespace = policy.namespace;
      const namespaceWorkloads = namespace
        ? getNamespaceWorkloads(context, namespace)
        : [];

      if (namespaceWorkloads.length === 0) {
        return [];
      }

      const matched = getMatchedWorkloadsForNetworkPolicy(context, policy);

      if (matched.length > 0) {
        return [];
      }

      return [
        createResourceFinding(context, policy, {
          ruleId: this.id,
          idSuffix: policy.name,
          title: this.title,
          message: `NetworkPolicy "${policy.name}" selector "${selectorToString(policy.podSelector)}" does not match any workloads in namespace "${namespace}".`,
          severity: "medium",
          category: this.category,
          path: "spec.podSelector",
          whyItMatters:
            "A policy that selects no pods gives a false sense of coverage and can leave the intended workloads completely unaffected.",
          recommendation:
            "Align spec.podSelector with the intended workload labels and verify that the policy still scopes to the right pods.",
        }),
      ];
    });
  },
};

export const defaultDenyNetworkPolicyDetectedRule: K8sRule = {
  id: "default-deny-networkpolicy-detected",
  title: "Default-deny NetworkPolicy detected",
  description:
    "A default-deny policy is a useful baseline signal, even though the final behavior still depends on the exact allow rules and the cluster CNI.",
  category: "networking",
  defaultSeverity: "info",
  run(context) {
    return context.networkPolicies.flatMap((policy) => {
      const coverage = isDefaultDenyPolicy(context, policy);

      if (!coverage.ingress && !coverage.egress) {
        return [];
      }

      const coveredDirections = [
        coverage.ingress ? "ingress" : undefined,
        coverage.egress ? "egress" : undefined,
      ].filter((value): value is string => value !== undefined);

      return [
        createResourceFinding(context, policy, {
          ruleId: this.id,
          idSuffix: policy.name,
          title: this.title,
          message: `NetworkPolicy "${policy.name}" appears to apply default-deny behavior for ${formatHumanList(coveredDirections)} in namespace "${policy.namespace}".`,
          severity: "info",
          category: this.category,
          path: "spec",
          whyItMatters:
            "A default-deny baseline can reduce accidental lateral exposure, but the real outcome still depends on the companion allow policies and the CNI's supported semantics.",
          recommendation:
            "Keep reviewing the allow policies that accompany this default-deny baseline so legitimate traffic paths still work after rollout.",
        }),
      ];
    });
  },
};

function getNamespacesWithAppWorkloads(context: Parameters<K8sRule["run"]>[0]) {
  return context.workloads
    .filter(
      (workload) =>
        workload.kind === "Pod" ||
        workload.kind === "Deployment" ||
        workload.kind === "StatefulSet" ||
        workload.kind === "DaemonSet" ||
        workload.kind === "ReplicaSet",
    )
    .map((workload) => workload.namespace);
}
