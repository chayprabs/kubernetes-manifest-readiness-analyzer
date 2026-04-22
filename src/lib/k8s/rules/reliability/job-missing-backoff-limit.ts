import type { K8sRule } from "@/lib/k8s/types";
import {
  createDocumentFinding,
  getSpecRecord,
  isStrictProfile,
} from "@/lib/k8s/rules/reliability/shared";

export const jobMissingBackoffLimitRule: K8sRule = {
  id: "job-missing-backoff-limit",
  title: "Job missing backoffLimit",
  description:
    "Batch Jobs should usually state how many retries are acceptable instead of relying on the platform default.",
  category: "reliability",
  defaultSeverity: "low",
  run(context) {
    return context.documents
      .filter((document) => document.kind === "Job")
      .flatMap((document) => {
        const spec = getSpecRecord(document);

        if (spec?.backoffLimit !== undefined) {
          return [];
        }

        return [
          createDocumentFinding(context, document, {
            ruleId: this.id,
            idSuffix: document.metadata.name ?? `document-${document.index}`,
            title: this.title,
            message: `Job "${document.metadata.name}" does not set spec.backoffLimit.`,
            severity: isStrictProfile(context) ? "medium" : "low",
            category: this.category,
            path: "spec.backoffLimit",
            whyItMatters:
              "If retry behavior is left implicit, failed batch work can take longer to surface or can repeat side effects more times than the team expects.",
            recommendation:
              "Set backoffLimit explicitly based on whether the Job is safe to retry and how quickly operators should see a failure.",
            fix: {
              summary: "Set an explicit retry budget for the Job.",
              yamlPath: "spec.backoffLimit",
              snippet: "backoffLimit: 1",
            },
          }),
        ];
      });
  },
};
