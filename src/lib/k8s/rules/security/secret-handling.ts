import type { K8sRule } from "@/lib/k8s/types";
import {
  buildEnvSecretRefSnippet,
  createDocumentFinding,
  createWorkloadFinding,
  getContainerSpecs,
  getEnvPath,
  toNonEmptyString,
  toRecord,
} from "@/lib/k8s/rules/security/shared";

const sensitiveEnvNamePattern =
  /(^|_)(password|passwd|secret|token|api[_-]?key|access[_-]?key|secret[_-]?key|private[_-]?key|client[_-]?secret|credentials|jwt)(_|$)/i;

export const literalSecretValuesRule: K8sRule = {
  id: "literal-secret-values",
  title: "Secret contains literal values",
  description:
    "Secrets with inline data or stringData deserve extra care because pasted manifests and exported reports can leak them if they are not redacted.",
  category: "security",
  defaultSeverity: "medium",
  run(context) {
    return context.documents
      .filter((document) => document.kind === "Secret")
      .flatMap((document) => {
        const data = toRecord(document.raw.data);
        const stringData = toRecord(document.raw.stringData);
        const entryCount =
          Object.keys(data ?? {}).length + Object.keys(stringData ?? {}).length;

        if (entryCount === 0) {
          return [];
        }

        return [
          createDocumentFinding(context, document, {
            ruleId: this.id,
            idSuffix: document.metadata.name ?? `document-${document.index}`,
            title: this.title,
            message: `Secret "${document.metadata.name}" includes ${entryCount} literal entr${entryCount === 1 ? "y" : "ies"} under data or stringData. This analyzer intentionally does not display secret values.`,
            severity: "medium",
            category: this.category,
            path: data ? "data" : "stringData",
            whyItMatters:
              "Inline secret values are easy to leak through screenshots, chat paste-ins, logs, or exported reports if the review flow does not redact them carefully.",
            recommendation:
              "Treat Secret manifests as sensitive input, keep values redacted in shared reports, and prefer secret delivery flows that avoid copying raw values around.",
            confidence: "high",
          }),
        ];
      });
  },
};

export const literalSensitiveEnvVarRule: K8sRule = {
  id: "literal-sensitive-env-var",
  title: "Sensitive environment variable uses a literal value",
  description:
    "Sensitive environment variables should usually reference a Secret instead of embedding the value directly in the manifest.",
  category: "security",
  defaultSeverity: "medium",
  run(context) {
    return context.workloads.flatMap((workload) =>
      getContainerSpecs(workload).flatMap((container) => {
        const envEntries = Array.isArray(container.record.env)
          ? container.record.env
          : [];

        return envEntries.flatMap((entry) => {
          const env = toRecord(entry);
          const envName = toNonEmptyString(env?.name);
          const hasLiteralValue = env?.value !== undefined;
          const secretKeyRef = toRecord(toRecord(env?.valueFrom)?.secretKeyRef);

          if (
            !envName ||
            !hasLiteralValue ||
            secretKeyRef ||
            !sensitiveEnvNamePattern.test(envName)
          ) {
            return [];
          }

          return [
            createWorkloadFinding(context, workload, {
              ruleId: this.id,
              idSuffix: `${workload.name}:${container.name}:${envName}`,
              title: this.title,
              message: `Environment variable "${envName}" on container "${container.name}" in ${workload.kind} "${workload.name}" uses a literal value instead of valueFrom.secretKeyRef.`,
              severity: "medium",
              category: this.category,
              path: getEnvPath(workload, container.name, envName),
              whyItMatters:
                "Literal secret-looking values in env blocks are easy to leak into source control, reviews, screenshots, or generated reports.",
              recommendation:
                "Move this value into a Secret and reference it with valueFrom.secretKeyRef so the manifest does not carry the raw secret.",
              fix: {
                summary:
                  "Reference a Secret for sensitive environment variables instead of embedding the value.",
                yamlPath: getEnvPath(workload, container.name, envName),
                snippet: buildEnvSecretRefSnippet(envName),
              },
              confidence: "high",
            }),
          ];
        });
      }),
    );
  },
};
