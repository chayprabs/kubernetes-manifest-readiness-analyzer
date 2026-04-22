import { isNamespacedKind } from "@/lib/k8s/resources";
import type { K8sRule } from "@/lib/k8s/types";
import {
  buildNamespaceSnippet,
  buildOwnershipSnippet,
  createDocumentFinding,
  createResourceFinding,
  getAppMetadataResources,
  isStrictLikeProfile,
  sizeInBytes,
} from "@/lib/k8s/rules/schema/shared";

const ownershipKeys = [
  "owner",
  "owners",
  "team",
  "contact",
  "oncall",
  "app.kubernetes.io/owner",
  "app.kubernetes.io/team",
];

const largeObjectWarningThresholdBytes = 512 * 1024;
const largeObjectRiskThresholdBytes = 900 * 1024;

export const missingNamespaceRule: K8sRule = {
  id: "missing-namespace",
  title: "Namespaced resource omits metadata.namespace",
  description:
    "Leaving metadata.namespace unset relies on the caller's default namespace, which can make production intent ambiguous.",
  category: "operations",
  defaultSeverity: "low",
  run(context) {
    return context.documents.flatMap((document) => {
      if (
        !document.kind ||
        !isNamespacedKind(document.kind) ||
        document.metadata.namespace
      ) {
        return [];
      }

      return [
        createDocumentFinding(context, document, {
          ruleId: this.id,
          idSuffix: `${document.kind}:${document.metadata.name ?? document.index}`,
          title: this.title,
          message: `${document.kind} "${document.metadata.name}" does not set metadata.namespace and will rely on the default namespace at apply time.`,
          severity: isStrictLikeProfile(context) ? "medium" : "low",
          category: this.category,
          path: "metadata.namespace",
          whyItMatters:
            "Implicit namespaces make promotion, review, and multi-environment automation harder because the same manifest can land in different namespaces depending on who applies it.",
          recommendation:
            "Set metadata.namespace explicitly for namespaced resources so the manifest states its intended destination clearly.",
          fix: {
            summary: "Add an explicit namespace instead of relying on the kubectl default.",
            yamlPath: "metadata.namespace",
            snippet: buildNamespaceSnippet(),
          },
        }),
      ];
    });
  },
};

export const hardcodedDefaultNamespaceRule: K8sRule = {
  id: "hardcoded-default-namespace",
  title: "Resource targets the default namespace",
  description:
    "Using the default namespace in production-style manifests can hide environment boundaries and ownership intent.",
  category: "operations",
  defaultSeverity: "low",
  run(context) {
    if (context.profile.id !== "strict") {
      return [];
    }

    return context.documents.flatMap((document) => {
      if (
        !document.kind ||
        !isNamespacedKind(document.kind) ||
        document.metadata.namespace !== "default"
      ) {
        return [];
      }

      return [
        createDocumentFinding(context, document, {
          ruleId: this.id,
          idSuffix: `${document.kind}:${document.metadata.name ?? document.index}`,
          title: this.title,
          message: `${document.kind} "${document.metadata.name}" is pinned to the "default" namespace.`,
          severity: "low",
          category: this.category,
          path: "metadata.namespace",
          whyItMatters:
            "Production manifests usually benefit from dedicated namespaces so ownership, policy, and lifecycle boundaries stay explicit instead of accumulating in default.",
          recommendation:
            "Move this resource into a purpose-specific namespace unless default is a deliberate and documented production choice.",
        }),
      ];
    });
  },
};

export const missingOwnerTeamAnnotationsRule: K8sRule = {
  id: "missing-owner-team-annotations",
  title: "Missing owner or team metadata",
  description:
    "Workloads are easier to operate when responders can see who owns them from the manifest metadata itself.",
  category: "operations",
  defaultSeverity: "low",
  run(context) {
    return getAppMetadataResources(context).flatMap((resource) => {
      const labelKeys = Object.keys(resource.labels);
      const annotationKeys = Object.keys(resource.annotations);
      const hasOwnershipMetadata = [...labelKeys, ...annotationKeys].some((key) =>
        ownershipKeys.some((candidate) => key.toLowerCase() === candidate),
      );

      if (hasOwnershipMetadata) {
        return [];
      }

      return [
        createResourceFinding(context, resource, {
          ruleId: this.id,
          idSuffix: resource.name,
          title: this.title,
          message: `${resource.kind} "${resource.name}" does not include obvious owner or team labels/annotations.`,
          severity: "low",
          category: this.category,
          path: "metadata.annotations",
          whyItMatters:
            "Ownership metadata helps alerts, dashboards, and change reviews point to the right team when something goes wrong.",
          recommendation:
            "Add a team label and owner annotation that match how your organization routes operational responsibility.",
          fix: {
            summary:
              "Attach simple owner/team metadata so responders can find the responsible team quickly.",
            yamlPath: "metadata.annotations",
            snippet: buildOwnershipSnippet(),
          },
          confidence: "medium",
        }),
      ];
    });
  },
};

export const largeConfigOrSecretRule: K8sRule = {
  id: "large-config-or-secret",
  title: "Large ConfigMap or Secret",
  description:
    "Very large objects are harder to manage and can run into Kubernetes object size limits or performance headaches.",
  category: "operations",
  defaultSeverity: "low",
  run(context) {
    return context.documents.flatMap((document) => {
      if (document.kind !== "ConfigMap" && document.kind !== "Secret") {
        return [];
      }

      const serializedBytes = sizeInBytes(document.raw);

      if (serializedBytes < largeObjectWarningThresholdBytes) {
        return [];
      }

      const severity =
        serializedBytes >= largeObjectRiskThresholdBytes ? "medium" : "low";
      const kib = Math.round(serializedBytes / 1024);

      return [
        createDocumentFinding(context, document, {
          ruleId: this.id,
          idSuffix: `${document.kind}:${document.metadata.name ?? document.index}`,
          title: this.title,
          message: `${document.kind} "${document.metadata.name}" serializes to roughly ${kib} KiB in this manifest bundle.`,
          severity,
          category: this.category,
          path: "data",
          whyItMatters:
            "Large ConfigMaps and Secrets are harder to review, can bloat deployments, and may approach Kubernetes object size limits depending on the final encoded payload.",
          recommendation:
            "Consider splitting oversized data, moving large binaries to object storage, or rechecking whether this object belongs in Kubernetes at all.",
          confidence: "medium",
        }),
      ];
    });
  },
};
