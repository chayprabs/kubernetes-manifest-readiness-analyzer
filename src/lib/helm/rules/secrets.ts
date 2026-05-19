import { createHelmFinding } from "@/lib/helm/findings";
import { getStringValue } from "@/lib/helm/paths";
import type { HelmRule } from "@/lib/helm/types";

const sensitiveKeyPattern =
  /(password|passwd|secret|token|apikey|api_key|private_key|credential)/iu;

export const helmPlaintextSecretRule: HelmRule = {
  id: "plaintext-secret-value",
  title: "Sensitive value stored in Helm values",
  defaultSeverity: "high",
  run(context) {
    return context.paths.flatMap((entry) => {
      const keySegment = entry.path.split(".").at(-1) ?? entry.path;
      if (!sensitiveKeyPattern.test(keySegment)) {
        return [];
      }

      const value = getStringValue(entry.value);
      if (!value || value.startsWith("{{")) {
        return [];
      }

      return [
        createHelmFinding({
          rule: helmPlaintextSecretRule,
          path: entry.path,
          message: `Key "${keySegment}" appears to embed a literal secret in values.yaml.`,
          severity: context.profile === "strict" ? "critical" : "high",
          recommendation:
            "Move secrets to ExternalSecrets, SealedSecrets, or chart hooks instead of plain values.",
        }),
      ];
    });
  },
};

export const helmSecretRules = [helmPlaintextSecretRule];
