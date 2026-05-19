import { detectSensitiveStringMatches } from "@/lib/privacy/secret-detection";
import type { HelmPrivacySummary } from "@/lib/helm/types";

export function analyzeHelmPrivacy(raw: string): HelmPrivacySummary {
  const signals = detectSensitiveStringMatches(raw);

  return {
    sensitiveDataDetected: signals.length > 0,
    signalCount: signals.length,
  };
}
