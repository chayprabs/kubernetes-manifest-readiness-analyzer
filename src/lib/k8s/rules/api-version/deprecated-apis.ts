import {
  kubernetesApiDeprecations,
  latestSupportedKubernetesTargetVersion,
  versionGte,
} from "@/lib/k8s/deprecations";
import type { K8sRule } from "@/lib/k8s/types";
import { createDocumentFinding } from "@/lib/k8s/rules/schema/shared";

export const deprecatedApiVersionRule: K8sRule = {
  id: "deprecated-api-version",
  title: "Deprecated or removed API version",
  description:
    "Deprecated API versions can break upgrades once the target Kubernetes version stops serving them.",
  category: "api-version",
  defaultSeverity: "medium",
  run(context) {
    const targetVersion =
      context.options.kubernetesTargetVersion ?? latestSupportedKubernetesTargetVersion;

    return context.documents.flatMap((document) => {
      if (!document.kind || !document.apiVersion) {
        return [];
      }

      const match = kubernetesApiDeprecations.find(
        (entry) =>
          entry.kind === document.kind && entry.apiVersion === document.apiVersion,
      );

      if (!match) {
        return [];
      }

      const removedForTarget = versionGte(targetVersion, match.removedIn);
      const replacement = match.replacementApiVersion
        ? ` Migrate to ${match.replacementApiVersion}${
            match.replacementAvailableSince
              ? `, available since v${match.replacementAvailableSince}`
              : ""
          }.`
        : "";

      return [
        createDocumentFinding(context, document, {
          ruleId: this.id,
          idSuffix: `${document.kind}:${document.metadata.name ?? document.index}`,
          title: this.title,
          message: removedForTarget
            ? `${document.kind} "${document.metadata.name}" uses ${document.apiVersion}, which is not served in the selected Kubernetes target version ${targetVersion}.`
            : `${document.kind} "${document.metadata.name}" uses ${document.apiVersion}, which is scheduled to stop being served in Kubernetes ${match.removedIn}.`,
          severity: removedForTarget ? "high" : "medium",
          category: this.category,
          path: "apiVersion",
          whyItMatters:
            "Upgrades can fail or leave automation broken when manifests still rely on API versions that the target cluster no longer serves.",
          recommendation: `${match.notes ?? "Update this manifest to a served API version before relying on a cluster upgrade."}${replacement}`,
          docsUrl: match.docsUrl,
          confidence: "high",
        }),
      ];
    });
  },
};

export const podSecurityPolicyRemovedRule: K8sRule = {
  id: "podsecuritypolicy-removed",
  title: "PodSecurityPolicy is removed",
  description:
    "PodSecurityPolicy is removed from modern Kubernetes and should be replaced with supported admission controls.",
  category: "api-version",
  defaultSeverity: "high",
  run(context) {
    const targetVersion =
      context.options.kubernetesTargetVersion ?? latestSupportedKubernetesTargetVersion;

    return context.documents.flatMap((document) => {
      if (document.kind !== "PodSecurityPolicy") {
        return [];
      }

      const removedForTarget = versionGte(targetVersion, "1.25");

      return [
        createDocumentFinding(context, document, {
          ruleId: this.id,
          idSuffix: document.metadata.name ?? `document-${document.index}`,
          title: this.title,
          message: removedForTarget
            ? `PodSecurityPolicy "${document.metadata.name}" is not served in the selected Kubernetes target version ${targetVersion}.`
            : `PodSecurityPolicy "${document.metadata.name}" is deprecated and removed in Kubernetes 1.25.`,
          severity: removedForTarget ? "high" : "medium",
          category: this.category,
          path: "kind",
          whyItMatters:
            "PodSecurityPolicy manifests will not protect workloads once the cluster version stops serving that API and removes the admission controller.",
          recommendation:
            "Migrate to Pod Security Admission or a reviewed third-party admission webhook before relying on this policy in newer clusters.",
          docsUrl:
            "https://kubernetes.io/docs/reference/using-api/deprecation-guide/",
          confidence: "high",
        }),
      ];
    });
  },
};
