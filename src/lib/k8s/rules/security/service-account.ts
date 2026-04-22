import type { K8sManifestDocument, K8sRule } from "@/lib/k8s/types";
import {
  createWorkloadFinding,
  getPodPath,
  getProductionStyleWorkloads,
  getServiceAccountName,
  toNonEmptyString,
  toRecord,
} from "@/lib/k8s/rules/security/shared";

export const automountServiceAccountTokenRule: K8sRule = {
  id: "automount-service-account-token",
  title: "automountServiceAccountToken should usually be false",
  description:
    "Most application workloads do not need direct Kubernetes API access, so automatic token mounting should be an explicit choice rather than a default.",
  category: "security",
  defaultSeverity: "low",
  run(context) {
    return getProductionStyleWorkloads(context).flatMap((workload) => {
      if (workload.podTemplate.spec.automountServiceAccountToken === false) {
        return [];
      }

      if (apiAccessSeemsIntentional(context.documents, workload.namespace, getServiceAccountName(workload))) {
        return [];
      }

      return [
        createWorkloadFinding(context, workload, {
          ruleId: this.id,
          idSuffix: workload.name,
          title: this.title,
          message: `${workload.kind} "${workload.name}" does not set automountServiceAccountToken: false.`,
          severity: "low",
          category: this.category,
          path: getPodPath(workload, "automountServiceAccountToken"),
          whyItMatters:
            "If the workload does not need the Kubernetes API, mounting a service account token creates an unnecessary credential inside the pod.",
          recommendation:
            "Set automountServiceAccountToken: false unless the workload has a reviewed reason to call the Kubernetes API.",
          fix: {
            summary:
              "Disable automatic service account token mounting for app workloads that do not need cluster API access.",
            yamlPath: getPodPath(workload, "automountServiceAccountToken"),
            snippet: "automountServiceAccountToken: false",
          },
          confidence: "medium",
        }),
      ];
    });
  },
};

export const defaultServiceAccountUsageRule: K8sRule = {
  id: "default-serviceaccount-usage",
  title: "Production workload uses the default ServiceAccount",
  description:
    "Using the default ServiceAccount makes permissions and token exposure harder to reason about than a workload-specific identity.",
  category: "security",
  defaultSeverity: "low",
  run(context) {
    return getProductionStyleWorkloads(context).flatMap((workload) => {
      const serviceAccountName = getServiceAccountName(workload);

      if (
        serviceAccountName !== "default" ||
        workload.podTemplate.spec.automountServiceAccountToken === false
      ) {
        return [];
      }

      return [
        createWorkloadFinding(context, workload, {
          ruleId: this.id,
          idSuffix: workload.name,
          title: this.title,
          message: `${workload.kind} "${workload.name}" uses the default ServiceAccount with its token mount still enabled.`,
          severity: "low",
          category: this.category,
          path: getPodPath(workload, "serviceAccountName"),
          whyItMatters:
            "Default ServiceAccounts often survive as an unreviewed fallback, which makes it easier to grant or expose permissions more broadly than intended.",
          recommendation:
            "Use a dedicated ServiceAccount for workloads that need cluster API access, and disable token mounting when they do not.",
          fix: {
            summary:
              "Move the workload off the default ServiceAccount and disable token mounting if the API is unnecessary.",
            yamlPath: getPodPath(workload),
            snippet: [
              "serviceAccountName: app-sa",
              "automountServiceAccountToken: false",
            ].join("\n"),
          },
        }),
      ];
    });
  },
};

function apiAccessSeemsIntentional(
  documents: K8sManifestDocument[],
  namespace: string | undefined,
  serviceAccountName: string,
) {
  if (serviceAccountName !== "default") {
    return true;
  }

  return documents.some((document) => {
    if (
      document.kind === "RoleBinding" ||
      document.kind === "ClusterRoleBinding"
    ) {
      const subjects = Array.isArray(document.raw.subjects)
        ? document.raw.subjects
        : [];

      return subjects.some((entry) => {
        const subject = toRecord(entry);
        const subjectKind = toNonEmptyString(subject?.kind);
        const subjectName = toNonEmptyString(subject?.name);
        const subjectNamespace =
          toNonEmptyString(subject?.namespace) ??
          document.metadata.namespace ??
          namespace;

        return (
          subjectKind === "ServiceAccount" &&
          subjectName === serviceAccountName &&
          subjectNamespace === namespace
        );
      });
    }

    if (document.kind === "ServiceAccount") {
      return (
        document.metadata.name === serviceAccountName &&
        (document.metadata.namespace ?? "default") === namespace
      );
    }

    return false;
  });
}
