import { createFinding } from "@/lib/k8s/findings";
import type { K8sRule } from "@/lib/k8s/types";
import {
  buildRecommendedLabelsSnippet,
  commonBuiltInKinds,
  createDocumentFinding,
  createResourceFinding,
  getAppMetadataResources,
  getDocumentByIndex,
  resolveIdentityKey,
} from "@/lib/k8s/rules/schema/shared";

const builtInApiGroups = new Set([
  "",
  "admissionregistration.k8s.io",
  "apiextensions.k8s.io",
  "apiregistration.k8s.io",
  "apps",
  "autoscaling",
  "batch",
  "certificates.k8s.io",
  "coordination.k8s.io",
  "discovery.k8s.io",
  "events.k8s.io",
  "extensions",
  "flowcontrol.apiserver.k8s.io",
  "networking.k8s.io",
  "node.k8s.io",
  "policy",
  "rbac.authorization.k8s.io",
  "scheduling.k8s.io",
  "storage.k8s.io",
]);

export const unknownOrUncommonKindRule: K8sRule = {
  id: "unknown-or-uncommon-kind",
  title: "Uncommon or custom kind",
  description:
    "The analyzer supports custom resources, but uncommon kinds get only generic checks until dedicated rules exist for them.",
  category: "schema",
  defaultSeverity: "info",
  run(context) {
    return context.documents.flatMap((document) => {
      if (!document.kind || commonBuiltInKinds.has(document.kind)) {
        return [];
      }

      const group = getApiGroup(document.apiVersion);
      const severity = builtInApiGroups.has(group) ? "low" : "info";
      const message = builtInApiGroups.has(group)
        ? `Resource kind "${document.kind}" in apiVersion "${document.apiVersion}" is not in the analyzer's common built-in kind set.`
        : `Resource kind "${document.kind}" in apiVersion "${document.apiVersion}" looks custom or uncommon. The analyzer will continue with generic checks only.`;

      return [
        createDocumentFinding(context, document, {
          ruleId: this.id,
          idSuffix: `${document.kind}:${document.metadata.name ?? document.index}`,
          title: this.title,
          message,
          severity,
          category: this.category,
          path: "kind",
          whyItMatters:
            "This is not a fatal problem, but it helps explain why the analyzer may not apply the same depth of workload-specific checks as it does for common built-in resources.",
          recommendation:
            "Continue the review, and add resource-specific checks later if this custom kind is important to your platform.",
          confidence: builtInApiGroups.has(group) ? "medium" : "high",
        }),
      ];
    });
  },
};

export const duplicateObjectIdentityRule: K8sRule = {
  id: "duplicate-object-identity",
  title: "Duplicate object identity in the manifest bundle",
  description:
    "Applying the same object identity more than once in one pasted bundle makes review results ambiguous and can hide later overrides.",
  category: "schema",
  defaultSeverity: "medium",
  run(context) {
    const documentsByIdentity = new Map<string, number[]>();

    for (const document of context.documents) {
      const identity = resolveIdentityKey(document);

      if (!identity) {
        continue;
      }

      const existing = documentsByIdentity.get(identity) ?? [];
      existing.push(document.index);
      documentsByIdentity.set(identity, existing);
    }

    return [...documentsByIdentity.entries()].flatMap(([identity, indexes]) => {
      if (indexes.length < 2) {
        return [];
      }

      return indexes.flatMap((documentIndex) => {
        const document = getDocumentByIndex(context, documentIndex);

        if (!document) {
          return [];
        }

        return [
          createDocumentFinding(context, document, {
            ruleId: this.id,
            idSuffix: `${identity}:${documentIndex}`,
            title: this.title,
            message: `${document.kind} "${document.metadata.name}" appears ${indexes.length} times in this manifest bundle with the same apiVersion and namespace identity.`,
            severity: "medium",
            category: this.category,
            path: "metadata.name",
            whyItMatters:
              "Duplicate object identities make it harder to tell which definition is intended to win and can hide accidental copy/paste drift in reviews.",
            recommendation:
              "Keep only one definition for each object identity in the pasted bundle, or change the name/namespace if the resources are meant to be distinct.",
          }),
        ];
      });
    });
  },
};

export const deploymentSelectorMismatchRule: K8sRule = {
  id: "deployment-selector-mismatch",
  title: "Deployment selector mismatch",
  description:
    "A Deployment selector must match its pod template labels or the controller cannot manage the intended pods correctly.",
  category: "schema",
  defaultSeverity: "high",
  run(context) {
    return context.relationshipGraph.issues
      .filter((issue) => issue.code === "deployment-selector-mismatch")
      .map((issue) =>
        createFinding({
          id: `${this.id}:${issue.sourceId}`,
          ruleId: this.id,
          title: this.title,
          message: issue.message,
          severity: issue.severity === "error" ? "high" : this.defaultSeverity,
          category: this.category,
          resourceRef: issue.sourceRef,
          whyItMatters: this.description,
          recommendation:
            "Make spec.selector.matchLabels and spec.template.metadata.labels match exactly so the Deployment owns the pods it creates.",
          confidence: "high",
        }),
      );
  },
};

export const missingRecommendedAppLabelsRule: K8sRule = {
  id: "missing-recommended-app-labels",
  title: "Missing recommended app labels",
  description:
    "Consistent app labels make workloads, Services, dashboards, and ownership tooling easier to understand and automate.",
  category: "best-practice",
  defaultSeverity: "low",
  run(context) {
    const recommendedKeys = [
      "app.kubernetes.io/name",
      "app.kubernetes.io/instance",
      "app.kubernetes.io/component",
      "app.kubernetes.io/part-of",
      "app.kubernetes.io/managed-by",
    ];

    return getAppMetadataResources(context).flatMap((resource) => {
      const missing = recommendedKeys.filter((key) => !resource.labels[key]);

      if (missing.length < 3) {
        return [];
      }

      return [
        createResourceFinding(context, resource, {
          ruleId: this.id,
          idSuffix: resource.name,
          title: this.title,
          message: `${resource.kind} "${resource.name}" is missing recommended app labels: ${missing.join(", ")}.`,
          severity: missing.length === recommendedKeys.length ? "medium" : "low",
          category: this.category,
          path: "metadata.labels",
          whyItMatters:
            "Recommended app labels help teams group related resources consistently across automation, dashboards, and incident response workflows.",
          recommendation:
            "Add the standard app.kubernetes.io labels with values that reflect the app name, instance, component, broader system, and deployment manager.",
          fix: {
            summary:
              "Add the recommended app.kubernetes.io labels with real values for this resource.",
            yamlPath: "metadata.labels",
            snippet: buildRecommendedLabelsSnippet(resource.name),
          },
          confidence: "high",
        }),
      ];
    });
  },
};

function getApiGroup(apiVersion: string | undefined) {
  if (!apiVersion) {
    return "";
  }

  const [group] = apiVersion.split("/");
  return apiVersion.includes("/") ? (group ?? "") : "";
}
