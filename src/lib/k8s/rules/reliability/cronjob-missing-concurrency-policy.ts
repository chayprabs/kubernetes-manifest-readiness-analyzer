import type { K8sRule } from "@/lib/k8s/types";
import {
  createDocumentFinding,
  getSpecRecord,
  toNonEmptyString,
} from "@/lib/k8s/rules/reliability/shared";

export const cronJobMissingConcurrencyPolicyRule: K8sRule = {
  id: "cronjob-missing-concurrency-policy",
  title: "CronJob missing concurrencyPolicy",
  description:
    "CronJobs should declare how overlapping runs are handled so retries and schedule delays do not surprise operators.",
  category: "reliability",
  defaultSeverity: "medium",
  run(context) {
    return context.documents
      .filter((document) => document.kind === "CronJob")
      .flatMap((document) => {
        const spec = getSpecRecord(document);

        if (toNonEmptyString(spec?.concurrencyPolicy)) {
          return [];
        }

        return [
          createDocumentFinding(context, document, {
            ruleId: this.id,
            idSuffix: document.metadata.name ?? `document-${document.index}`,
            title: this.title,
            message: `CronJob "${document.metadata.name}" does not set spec.concurrencyPolicy.`,
            severity: "medium",
            category: this.category,
            path: "spec.concurrencyPolicy",
            whyItMatters:
              "When the schedule runs again before the previous Job finishes, the platform default may permit overlapping executions that duplicate work or contend with each other.",
            recommendation:
              "Set concurrencyPolicy explicitly. Forbid is a good starting point when overlapping runs are unsafe; Replace can work when only the latest run matters.",
            fix: {
              summary: "Set an explicit CronJob concurrencyPolicy.",
              yamlPath: "spec.concurrencyPolicy",
              snippet: "concurrencyPolicy: Forbid",
            },
          }),
        ];
      });
  },
};
