import type { K8sRule } from "@/lib/k8s/types";
import {
  createDocumentFinding,
  formatHumanList,
  getSpecRecord,
} from "@/lib/k8s/rules/reliability/shared";

export const cronJobMissingHistoryLimitsRule: K8sRule = {
  id: "cronjob-missing-history-limits",
  title: "CronJob missing history limits",
  description:
    "History limits keep completed Jobs from accumulating indefinitely and make scheduled workloads easier to operate.",
  category: "reliability",
  defaultSeverity: "low",
  run(context) {
    return context.documents
      .filter((document) => document.kind === "CronJob")
      .flatMap((document) => {
        const spec = getSpecRecord(document);
        const missing = [
          spec?.successfulJobsHistoryLimit === undefined
            ? "successfulJobsHistoryLimit"
            : undefined,
          spec?.failedJobsHistoryLimit === undefined
            ? "failedJobsHistoryLimit"
            : undefined,
        ].filter((value): value is string => value !== undefined);

        if (missing.length === 0) {
          return [];
        }

        return [
          createDocumentFinding(context, document, {
            ruleId: this.id,
            idSuffix: document.metadata.name ?? `document-${document.index}`,
            title: this.title,
            message: `CronJob "${document.metadata.name}" does not set ${formatHumanList(missing)}.`,
            severity: "low",
            category: this.category,
            path: "spec",
            whyItMatters:
              "Leaving job history limits implicit can clutter the namespace with completed Jobs and make it harder to review only the runs operators still care about.",
            recommendation:
              "Set modest successful and failed history limits that match your operational needs instead of relying on implicit defaults.",
            fix: {
              summary: "Set explicit CronJob history retention limits.",
              yamlPath: "spec",
              snippet: [
                "successfulJobsHistoryLimit: 3",
                "failedJobsHistoryLimit: 1",
              ].join("\n"),
            },
          }),
        ];
      });
  },
};
