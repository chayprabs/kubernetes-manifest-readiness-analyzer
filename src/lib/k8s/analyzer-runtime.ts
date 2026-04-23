import { RECOMMENDED_MAX_PASTE_BYTES } from "@/lib/k8s/errors";

export const BROWSER_ANALYSIS_HARD_MAX_BYTES = 10 * 1024 * 1024;

export function getAutoAnalyzeDelayMs(inputBytes: number) {
  if (inputBytes > RECOMMENDED_MAX_PASTE_BYTES) {
    return null;
  }

  if (inputBytes > 1024 * 1024) {
    return 1400;
  }

  if (inputBytes > 256 * 1024) {
    return 900;
  }

  return 500;
}

export function estimateYamlDocumentCount(source: string) {
  const normalizedSource = source.trim();

  if (normalizedSource.length === 0) {
    return 0;
  }

  const lines = source.split(/\r?\n/u);
  const separatorCount = lines.filter((line) =>
    /^---(?:\s+#.*)?\s*$/u.test(line.trimEnd()),
  ).length;
  const firstNonEmptyLine = lines.find((line) => line.trim().length > 0);
  const leadingDocumentMarker =
    firstNonEmptyLine !== undefined &&
    /^---(?:\s+#.*)?\s*$/u.test(firstNonEmptyLine.trimEnd());

  return Math.max(1, separatorCount + (leadingDocumentMarker ? 0 : 1));
}

export function formatDurationMs(durationMs: number) {
  if (durationMs < 1000) {
    return `${Math.max(1, Math.round(durationMs))} ms`;
  }

  return `${(durationMs / 1000).toFixed(2)} s`;
}
