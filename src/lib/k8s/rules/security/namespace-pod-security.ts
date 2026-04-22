import type { K8sRule } from "@/lib/k8s/types";
import { createDocumentFinding } from "@/lib/k8s/rules/security/shared";

export const namespaceMissingPodSecurityEnforceRule: K8sRule = {
  id: "namespace-missing-pod-security-enforce",
  title: "Namespace lacks pod-security enforce label",
  description:
    "Namespaces without pod-security enforce labels leave the baseline admission expectation implicit instead of visible in the manifest review.",
  category: "security",
  defaultSeverity: "info",
  run(context) {
    return context.documents
      .filter((document) => document.kind === "Namespace")
      .flatMap((document) => {
        if (document.metadata.labels["pod-security.kubernetes.io/enforce"]) {
          return [];
        }

        return [
          createDocumentFinding(context, document, {
            ruleId: this.id,
            idSuffix: document.metadata.name ?? `document-${document.index}`,
            title: this.title,
            message: `Namespace "${document.metadata.name}" does not set pod-security.kubernetes.io/enforce.`,
            severity: "info",
            category: this.category,
            path: "metadata.labels",
            whyItMatters:
              "Making the namespace pod-security level explicit helps reviewers understand the intended admission baseline, even though this analyzer does not attempt full Pod Security Admission parity.",
            recommendation:
              "Add pod-security.kubernetes.io/enforce and its version label if the namespace should have an explicit pod-security baseline.",
            fix: {
              summary:
                "Declare the namespace pod-security baseline explicitly.",
              yamlPath: "metadata.labels",
              snippet: [
                "metadata:",
                "  labels:",
                "    pod-security.kubernetes.io/enforce: restricted",
                "    pod-security.kubernetes.io/enforce-version: latest",
              ].join("\n"),
            },
          }),
        ];
      });
  },
};
