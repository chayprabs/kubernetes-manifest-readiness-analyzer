import { normalizeKubernetesVersion } from "@/lib/k8s/deprecations";
import { findingCategories, findingSeverities } from "@/lib/k8s/findings";
import type {
  K8sAnalysisReport,
  K8sFindingCategory,
  K8sFindingSeverity,
} from "@/lib/k8s/types";

/**
 * Privacy guardrail:
 * Analytics payloads are intentionally limited to coarse product telemetry.
 * They must never contain raw YAML, resource names, namespaces, labels,
 * annotations, secret-looking strings, or free-form finding text.
 */
export const analyticsEventNames = [
  "tool_viewed",
  "sample_loaded",
  "analysis_started",
  "analysis_completed",
  "analysis_failed",
  "report_copied",
  "report_downloaded",
  "fix_copied",
  "export_opened",
  "privacy_warning_shown",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export const analyticsInputSizeBuckets = [
  "empty",
  "lt-4kb",
  "4kb-32kb",
  "32kb-128kb",
  "128kb-512kb",
  "512kb-1mb",
  "gt-1mb",
] as const;

export type AnalyticsInputSizeBucket =
  (typeof analyticsInputSizeBuckets)[number];

export const analyticsDurationBuckets = [
  "lt-100ms",
  "100ms-500ms",
  "500ms-1s",
  "1s-3s",
  "3s-10s",
  "gt-10s",
] as const;

export type AnalyticsDurationBucket =
  (typeof analyticsDurationBuckets)[number];

export type SafeSeverityCounts = Partial<
  Record<K8sFindingSeverity, number>
>;

export type SafeCategoryCounts = Partial<
  Record<K8sFindingCategory, number>
>;

type AnalyticsSharedPayload = {
  toolId: string;
  profile?: string;
  kubernetesVersion?: string;
  inputSizeBucket?: AnalyticsInputSizeBucket;
  documentCount?: number;
  severityCounts?: SafeSeverityCounts;
  categoryCounts?: SafeCategoryCounts;
  analysisDurationBucket?: AnalyticsDurationBucket;
  browserLocale?: string;
};

export type AnalyticsEventMap = {
  tool_viewed: Pick<
    AnalyticsSharedPayload,
    "toolId" | "profile" | "kubernetesVersion" | "browserLocale"
  >;
  sample_loaded: Pick<
    AnalyticsSharedPayload,
    | "toolId"
    | "profile"
    | "kubernetesVersion"
    | "inputSizeBucket"
    | "documentCount"
    | "browserLocale"
  >;
  analysis_started: Pick<
    AnalyticsSharedPayload,
    | "toolId"
    | "profile"
    | "kubernetesVersion"
    | "inputSizeBucket"
    | "documentCount"
    | "browserLocale"
  >;
  analysis_completed: Pick<
    AnalyticsSharedPayload,
    | "toolId"
    | "profile"
    | "kubernetesVersion"
    | "inputSizeBucket"
    | "documentCount"
    | "severityCounts"
    | "categoryCounts"
    | "analysisDurationBucket"
    | "browserLocale"
  >;
  analysis_failed: Pick<
    AnalyticsSharedPayload,
    | "toolId"
    | "profile"
    | "kubernetesVersion"
    | "inputSizeBucket"
    | "documentCount"
    | "analysisDurationBucket"
    | "browserLocale"
  >;
  report_copied: Pick<
    AnalyticsSharedPayload,
    | "toolId"
    | "profile"
    | "kubernetesVersion"
    | "inputSizeBucket"
    | "documentCount"
    | "severityCounts"
    | "categoryCounts"
    | "analysisDurationBucket"
    | "browserLocale"
  >;
  report_downloaded: Pick<
    AnalyticsSharedPayload,
    | "toolId"
    | "profile"
    | "kubernetesVersion"
    | "inputSizeBucket"
    | "documentCount"
    | "severityCounts"
    | "categoryCounts"
    | "analysisDurationBucket"
    | "browserLocale"
  >;
  fix_copied: Pick<
    AnalyticsSharedPayload,
    | "toolId"
    | "profile"
    | "kubernetesVersion"
    | "inputSizeBucket"
    | "documentCount"
    | "severityCounts"
    | "categoryCounts"
    | "analysisDurationBucket"
    | "browserLocale"
  >;
  export_opened: Pick<
    AnalyticsSharedPayload,
    | "toolId"
    | "profile"
    | "kubernetesVersion"
    | "inputSizeBucket"
    | "documentCount"
    | "severityCounts"
    | "categoryCounts"
    | "analysisDurationBucket"
    | "browserLocale"
  >;
  privacy_warning_shown: Pick<
    AnalyticsSharedPayload,
    | "toolId"
    | "profile"
    | "kubernetesVersion"
    | "inputSizeBucket"
    | "documentCount"
    | "severityCounts"
    | "categoryCounts"
    | "analysisDurationBucket"
    | "browserLocale"
  >;
};

export type AnalyticsEventPayloadInput = {
  [key: string]: unknown;
  toolId?: unknown;
  profile?: unknown;
  kubernetesVersion?: unknown;
  inputSizeBucket?: unknown;
  inputSizeBytes?: unknown;
  documentCount?: unknown;
  severityCounts?: unknown;
  categoryCounts?: unknown;
  analysisDurationBucket?: unknown;
  analysisDurationMs?: unknown;
  browserLocale?: unknown;
};

export type AnalyticsEvent = {
  [Name in AnalyticsEventName]: {
    name: Name;
    payload: AnalyticsEventMap[Name];
  };
}[AnalyticsEventName];

export type AnalyticsClientErrorCategory =
  | "abort"
  | "chunk-load"
  | "network"
  | "render"
  | "unknown";

export type AnalyticsClientErrorReport = {
  name: string;
  category: AnalyticsClientErrorCategory;
  route?: string;
  toolId?: string;
  browserLocale?: string;
  digest?: string;
};

type AnalyticsClientErrorContext = {
  route?: unknown | undefined;
  toolId?: unknown | undefined;
  browserLocale?: unknown | undefined;
  digest?: unknown | undefined;
};

const analyticsEventNameSet = new Set<string>(analyticsEventNames);

export function sanitizeAnalyticsEvent(
  name: string,
  payload: AnalyticsEventPayloadInput = {},
): AnalyticsEvent | null {
  if (!analyticsEventNameSet.has(name)) {
    return null;
  }

  const eventName = name as AnalyticsEventName;

  const toolId = sanitizeSlugLikeValue(payload.toolId);

  if (!toolId) {
    return null;
  }

  const sharedPayload = {
    toolId,
    ...pickOptional("profile", sanitizeSlugLikeValue(payload.profile)),
    ...pickOptional(
      "kubernetesVersion",
      sanitizeKubernetesVersion(payload.kubernetesVersion),
    ),
    ...pickOptional(
      "inputSizeBucket",
      sanitizeInputSizeBucket(payload.inputSizeBucket, payload.inputSizeBytes),
    ),
    ...pickOptional("documentCount", sanitizeCount(payload.documentCount)),
    ...pickOptional(
      "severityCounts",
      sanitizeSeverityCounts(payload.severityCounts),
    ),
    ...pickOptional(
      "categoryCounts",
      sanitizeCategoryCounts(payload.categoryCounts),
    ),
    ...pickOptional(
      "analysisDurationBucket",
      sanitizeDurationBucket(
        payload.analysisDurationBucket,
        payload.analysisDurationMs,
      ),
    ),
    ...pickOptional(
      "browserLocale",
      sanitizeBrowserLocale(payload.browserLocale),
    ),
  } satisfies AnalyticsSharedPayload;

  switch (eventName) {
    case "tool_viewed":
      return {
        name: eventName,
        payload: pickSharedPayload(sharedPayload, [
          "toolId",
          "profile",
          "kubernetesVersion",
          "browserLocale",
        ]) as AnalyticsEventMap["tool_viewed"],
      };
    case "sample_loaded":
    case "analysis_started":
      return {
        name: eventName,
        payload: pickSharedPayload(sharedPayload, [
          "toolId",
          "profile",
          "kubernetesVersion",
          "inputSizeBucket",
          "documentCount",
          "browserLocale",
        ]) as AnalyticsEventMap["sample_loaded"],
      };
    case "analysis_completed":
    case "report_copied":
    case "report_downloaded":
    case "fix_copied":
    case "export_opened":
    case "privacy_warning_shown":
      return {
        name: eventName,
        payload: pickSharedPayload(sharedPayload, [
          "toolId",
          "profile",
          "kubernetesVersion",
          "inputSizeBucket",
          "documentCount",
          "severityCounts",
          "categoryCounts",
          "analysisDurationBucket",
          "browserLocale",
        ]) as AnalyticsEventMap["analysis_completed"],
      };
    case "analysis_failed":
      return {
        name: eventName,
        payload: pickSharedPayload(sharedPayload, [
          "toolId",
          "profile",
          "kubernetesVersion",
          "inputSizeBucket",
          "documentCount",
          "analysisDurationBucket",
          "browserLocale",
        ]) as AnalyticsEventMap["analysis_failed"],
      };
  }
}

export function createK8sAnalyticsPayloadInput(params: {
  toolId: string;
  profile?: string | undefined;
  kubernetesVersion?: string | undefined;
  inputSizeBytes?: number | undefined;
  documentCount?: number | undefined;
  severityCounts?: SafeSeverityCounts | undefined;
  categoryCounts?: SafeCategoryCounts | undefined;
  analysisDurationMs?: number | undefined;
  browserLocale?: string | undefined;
}): AnalyticsEventPayloadInput {
  return {
    toolId: params.toolId,
    ...pickOptional("profile", params.profile),
    ...pickOptional("kubernetesVersion", params.kubernetesVersion),
    ...pickOptional("inputSizeBytes", params.inputSizeBytes),
    ...pickOptional("documentCount", params.documentCount),
    ...pickOptional("severityCounts", params.severityCounts),
    ...pickOptional("categoryCounts", params.categoryCounts),
    ...pickOptional("analysisDurationMs", params.analysisDurationMs),
    ...pickOptional("browserLocale", params.browserLocale),
  };
}

export function createK8sAnalyticsPayloadInputFromReport(params: {
  toolId: string;
  report: K8sAnalysisReport;
  browserLocale?: string | undefined;
}): AnalyticsEventPayloadInput {
  const { report } = params;

  return createK8sAnalyticsPayloadInput({
    toolId: params.toolId,
    profile: report.profile.id,
    kubernetesVersion: report.options.kubernetesTargetVersion,
    inputSizeBytes: report.analysisMetadata.inputBytes,
    documentCount: report.analysisMetadata.documentCount,
    severityCounts: report.severityCounts,
    categoryCounts: report.categoryCounts,
    analysisDurationMs: report.analysisMetadata.totalMs,
    browserLocale: params.browserLocale,
  });
}

export function getAnalyticsBrowserLocale() {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  return sanitizeBrowserLocale(navigator.language);
}

export function getAnalyticsInputSizeBucket(
  sizeBytes: number,
): AnalyticsInputSizeBucket {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "empty";
  }

  if (sizeBytes < 4 * 1024) {
    return "lt-4kb";
  }

  if (sizeBytes < 32 * 1024) {
    return "4kb-32kb";
  }

  if (sizeBytes < 128 * 1024) {
    return "32kb-128kb";
  }

  if (sizeBytes < 512 * 1024) {
    return "128kb-512kb";
  }

  if (sizeBytes < 1024 * 1024) {
    return "512kb-1mb";
  }

  return "gt-1mb";
}

export function getAnalyticsDurationBucket(
  durationMs: number,
): AnalyticsDurationBucket {
  if (!Number.isFinite(durationMs) || durationMs < 100) {
    return "lt-100ms";
  }

  if (durationMs < 500) {
    return "100ms-500ms";
  }

  if (durationMs < 1000) {
    return "500ms-1s";
  }

  if (durationMs < 3000) {
    return "1s-3s";
  }

  if (durationMs < 10000) {
    return "3s-10s";
  }

  return "gt-10s";
}

export function sanitizeClientErrorReport(
  error: unknown,
  context: AnalyticsClientErrorContext = {},
): AnalyticsClientErrorReport {
  const normalizedError = normalizeError(error);
  const digest = sanitizeDigest(
    context.digest ??
      (isErrorWithDigest(error) ? error.digest : undefined),
  );

  return {
    name: sanitizeErrorName(normalizedError.name),
    category: categorizeClientError(normalizedError),
    ...pickOptional("route", sanitizeRoute(context.route)),
    ...pickOptional("toolId", sanitizeSlugLikeValue(context.toolId)),
    ...pickOptional(
      "browserLocale",
      sanitizeBrowserLocale(context.browserLocale),
    ),
    ...pickOptional("digest", digest),
  };
}

function pickSharedPayload(
  payload: AnalyticsSharedPayload,
  keys: readonly (keyof AnalyticsSharedPayload)[],
): Partial<AnalyticsSharedPayload> {
  const result: Partial<AnalyticsSharedPayload> = {};
  const mutableResult = result as Record<string, unknown>;

  for (const key of keys) {
    const value = payload[key];

    if (value !== undefined) {
      mutableResult[key] = value;
    }
  }

  return result;
}

function sanitizeSlugLikeValue(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(normalized)) {
    return undefined;
  }

  return normalized.slice(0, 80);
}

function sanitizeKubernetesVersion(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return normalizeKubernetesVersion(value);
}

function sanitizeBrowserLocale(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  if (!/^[A-Za-z0-9-]{2,35}$/u.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function sanitizeInputSizeBucket(
  directBucket: unknown,
  sizeBytes: unknown,
) {
  if (typeof directBucket === "string") {
    return analyticsInputSizeBuckets.includes(
      directBucket as AnalyticsInputSizeBucket,
    )
      ? (directBucket as AnalyticsInputSizeBucket)
      : undefined;
  }

  if (typeof sizeBytes !== "number") {
    return undefined;
  }

  return getAnalyticsInputSizeBucket(sizeBytes);
}

function sanitizeDurationBucket(
  directBucket: unknown,
  durationMs: unknown,
) {
  if (typeof directBucket === "string") {
    return analyticsDurationBuckets.includes(
      directBucket as AnalyticsDurationBucket,
    )
      ? (directBucket as AnalyticsDurationBucket)
      : undefined;
  }

  if (typeof durationMs !== "number") {
    return undefined;
  }

  return getAnalyticsDurationBucket(durationMs);
}

function sanitizeSeverityCounts(value: unknown) {
  return sanitizeCountRecord(value, findingSeverities);
}

function sanitizeCategoryCounts(value: unknown) {
  return sanitizeCountRecord(value, findingCategories);
}

function sanitizeCountRecord<Key extends string>(
  value: unknown,
  allowedKeys: readonly Key[],
) {
  if (!isRecord(value)) {
    return undefined;
  }

  const result = allowedKeys.reduce(
    (counts, key) => {
      const count = sanitizeCount(value[key]);

      if (count !== undefined) {
        counts[key] = count;
      }

      return counts;
    },
    {} as Partial<Record<Key, number>>,
  );

  return Object.keys(result).length > 0 ? result : undefined;
}

function sanitizeCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  const normalized = Math.trunc(value);

  if (normalized < 0) {
    return undefined;
  }

  return Math.min(normalized, 100000);
}

function sanitizeRoute(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  if (!/^\/[a-zA-Z0-9/_-]{0,120}$/u.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function sanitizeDigest(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  if (!/^[A-Za-z0-9:_-]{4,120}$/u.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function sanitizeErrorName(value: unknown) {
  if (typeof value !== "string") {
    return "Error";
  }

  const normalized = value.trim();

  if (!/^[A-Za-z][A-Za-z0-9:_-]{0,80}$/u.test(normalized)) {
    return "Error";
  }

  return normalized;
}

function categorizeClientError(error: Error): AnalyticsClientErrorCategory {
  const haystack = `${error.name} ${error.message}`.toLowerCase();

  if (haystack.includes("abort")) {
    return "abort";
  }

  if (
    haystack.includes("chunkloaderror") ||
    haystack.includes("loading chunk") ||
    haystack.includes("failed to fetch dynamically imported module")
  ) {
    return "chunk-load";
  }

  if (
    haystack.includes("networkerror") ||
    haystack.includes("failed to fetch") ||
    haystack.includes("network request")
  ) {
    return "network";
  }

  if (error.name !== "Error" || error.message.trim().length > 0) {
    return "render";
  }

  return "unknown";
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return new Error(error.trim());
  }

  return new Error("Unknown client error");
}

function isErrorWithDigest(
  error: unknown,
): error is Error & { digest?: string } {
  return error instanceof Error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickOptional<Key extends string, Value>(
  key: Key,
  value: Value | undefined,
) {
  if (value === undefined) {
    return {};
  }

  return { [key]: value } as Record<Key, Value>;
}
