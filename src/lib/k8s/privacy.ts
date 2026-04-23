import { stringify } from "yaml";
import type {
  K8sAnalysisReport,
  K8sManifestDocument,
  K8sObjectRef,
  K8sParseResult,
  K8sPrivacySignal,
  K8sPrivacySignalKind,
  K8sPrivacySummary,
} from "@/lib/k8s/types";
import {
  REDACTED_ANNOTATION_VALUE,
  REDACTED_ENV_VALUE,
  REDACTED_SECRET_VALUE,
  redactSensitiveText,
  redactYamlLikeText,
} from "@/lib/privacy/redaction";
import {
  detectSensitiveStringMatches,
  hasSensitiveStringMatch,
  isSensitiveAnnotationKey,
  isSensitiveFieldName,
} from "@/lib/privacy/secret-detection";

type RedactionOptions = {
  redactSensitiveOutput?: boolean;
};

type WalkContext = {
  documentIndex: number;
  resourceRef: K8sObjectRef;
  path: string[];
  insideSecretObject: boolean;
};

type RedactContext = {
  path: string[];
  insideSecretObject: boolean;
};

type K8sSafeAnalyticsPayload = {
  readinessScore: number;
  readinessGrade: K8sAnalysisReport["readinessGrade"];
  riskLevel: K8sAnalysisReport["riskLevel"];
  options: K8sAnalysisReport["options"];
  analysisMetadata: K8sAnalysisReport["analysisMetadata"];
  findingCount: number;
  severityCounts: K8sAnalysisReport["severityCounts"];
  categoryCounts: K8sAnalysisReport["categoryCounts"];
  privacy: Pick<
    K8sPrivacySummary,
    "sensitiveDataDetected" | "signalCount" | "detectedKinds"
  >;
};

export function createEmptyK8sPrivacySummary(): K8sPrivacySummary {
  return {
    sensitiveDataDetected: false,
    signalCount: 0,
    detectedKinds: [],
    warningTitle: "No obvious sensitive manifest values detected",
    warningText:
      "Visible exports still exclude raw YAML by default, but this report did not detect obvious Secret values, sensitive env literals, or risky annotations.",
    signals: [],
  };
}

export function analyzeK8sPrivacy(
  raw: string,
  parseResult: K8sParseResult,
): K8sPrivacySummary {
  const signals = new Map<string, K8sPrivacySignal>();

  for (const document of parseResult.documents) {
    collectDocumentPrivacySignals(document, signals);
  }

  if (signals.size === 0) {
    collectRawManifestSignals(raw, signals);
  }

  const values = [...signals.values()];
  const detectedKinds = dedupeKinds(values.map((signal) => signal.kind));

  if (values.length === 0) {
    return createEmptyK8sPrivacySummary();
  }

  return {
    sensitiveDataDetected: true,
    signalCount: values.length,
    detectedKinds,
    warningTitle: "Sensitive data detected",
    warningText: `This manifest bundle includes ${values.length} sensitive signal${values.length === 1 ? "" : "s"} across ${formatKindsForSentence(detectedKinds)}. Visible JSON and exports stay redacted by default.`,
    signals: values,
  };
}

export function buildVisibleK8sReportJson(
  report: K8sAnalysisReport,
  options: RedactionOptions = {},
) {
  const visibleReport = redactK8sValueForDisplay(report, options);

  return JSON.stringify(visibleReport, null, 2);
}

export function redactK8sValueForDisplay<T>(
  value: T,
  options: RedactionOptions = {},
) {
  if (options.redactSensitiveOutput === false) {
    return value;
  }

  return redactK8sValue(value, {
    path: [],
    insideSecretObject: false,
  }) as T;
}

export function buildExportableManifestText(
  report: K8sAnalysisReport,
  options: RedactionOptions = {},
) {
  if (options.redactSensitiveOutput === false) {
    return report.raw;
  }

  if (report.parseResult.documents.length === 0) {
    return redactYamlLikeText(report.raw);
  }

  return report.parseResult.documents
    .map((document) => {
      const redactedDocument = redactK8sValue(document.raw, {
        path: ["document", String(document.index)],
        insideSecretObject: document.kind === "Secret",
      });

      return stringify(redactedDocument).trimEnd();
    })
    .join("\n---\n");
}

export function buildSafeK8sAnalyticsPayload(
  report: K8sAnalysisReport,
): K8sSafeAnalyticsPayload {
  return {
    readinessScore: report.readinessScore,
    readinessGrade: report.readinessGrade,
    riskLevel: report.riskLevel,
    options: report.options,
    analysisMetadata: report.analysisMetadata,
    findingCount: report.findings.length,
    severityCounts: report.severityCounts,
    categoryCounts: report.categoryCounts,
    privacy: {
      sensitiveDataDetected: report.privacy.sensitiveDataDetected,
      signalCount: report.privacy.signalCount,
      detectedKinds: report.privacy.detectedKinds,
    },
  };
}

function collectDocumentPrivacySignals(
  document: K8sManifestDocument,
  signals: Map<string, K8sPrivacySignal>,
) {
  walkDocumentValue(document.raw, signals, {
    documentIndex: document.index,
    resourceRef: document.objectRef,
    path: [],
    insideSecretObject: document.kind === "Secret",
  });
}

function walkDocumentValue(
  value: unknown,
  signals: Map<string, K8sPrivacySignal>,
  context: WalkContext,
) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      walkDocumentValue(entry, signals, {
        ...context,
        path: [...context.path, String(index)],
      });
    });
    return;
  }

  if (isRecord(value)) {
    const kind =
      typeof value.kind === "string" ? value.kind : context.resourceRef.kind;
    const insideSecretObject = context.insideSecretObject || kind === "Secret";
    const secretData = isRecord(value.data);
    const secretStringData = isRecord(value.stringData);

    if (insideSecretObject && secretData) {
      for (const keyName of Object.keys(secretData)) {
        addSignal(signals, {
          kind: "secret-data",
          summary: `Secret data entry "${keyName}" is present and treated as sensitive.`,
          fieldPath: buildFieldPath([...context.path, "data", keyName]),
          documentIndex: context.documentIndex,
          resourceRef: context.resourceRef,
          keyName,
        });
      }
    }

    if (insideSecretObject && secretStringData) {
      for (const keyName of Object.keys(secretStringData)) {
        addSignal(signals, {
          kind: "secret-string-data",
          summary: `Secret stringData entry "${keyName}" is present and treated as sensitive.`,
          fieldPath: buildFieldPath([...context.path, "stringData", keyName]),
          documentIndex: context.documentIndex,
          resourceRef: context.resourceRef,
          keyName,
        });
      }
    }

    const annotations = isRecord(value.annotations) ? value.annotations : null;

    if (annotations) {
      for (const [keyName, annotationValue] of Object.entries(annotations)) {
        if (
          isSensitiveAnnotationKey(keyName) ||
          hasSensitiveStringMatch(String(annotationValue), { keyName })
        ) {
          addSignal(signals, {
            kind: "sensitive-annotation",
            summary: `Annotation "${keyName}" looks sensitive and should stay redacted.`,
            fieldPath: buildFieldPath([
              ...context.path,
              "annotations",
              keyName,
            ]),
            documentIndex: context.documentIndex,
            resourceRef: context.resourceRef,
            keyName,
          });
        }
      }
    }

    const valueFrom = isRecord(value.valueFrom) ? value.valueFrom : undefined;
    const secretKeyRef = isRecord(valueFrom?.secretKeyRef)
      ? valueFrom.secretKeyRef
      : undefined;

    if (
      typeof value.name === "string" &&
      Object.hasOwn(value, "value") &&
      isSensitiveFieldName(value.name) &&
      !secretKeyRef
    ) {
      addSignal(signals, {
        kind: "sensitive-env-var",
        summary: `Environment variable "${value.name}" uses a literal value and should stay redacted.`,
        fieldPath: buildFieldPath([...context.path, "value"]),
        documentIndex: context.documentIndex,
        resourceRef: context.resourceRef,
        keyName: value.name,
      });
    }

    for (const [keyName, entryValue] of Object.entries(value)) {
      walkDocumentValue(entryValue, signals, {
        documentIndex: context.documentIndex,
        resourceRef: context.resourceRef,
        path: [...context.path, keyName],
        insideSecretObject,
      });
    }

    return;
  }

  if (typeof value !== "string") {
    return;
  }

  const keyName = context.path.at(-1);
  const matchKinds = dedupeKinds(
    detectSensitiveStringMatches(value, { keyName }).flatMap((match) => {
      switch (match.kind) {
        case "cloud-credential":
          return ["cloud-credential"] satisfies K8sPrivacySignalKind[];
        case "private-key":
          return ["private-key"] satisfies K8sPrivacySignalKind[];
        case "internal-hostname":
          return ["internal-hostname"] satisfies K8sPrivacySignalKind[];
        case "secret-like":
          return [];
      }
    }),
  );

  for (const kind of matchKinds) {
    const signal: K8sPrivacySignal = {
      kind,
      summary: getSignalSummary(kind, keyName),
      fieldPath: buildFieldPath(context.path),
      documentIndex: context.documentIndex,
      resourceRef: context.resourceRef,
      ...(keyName ? { keyName } : {}),
    };

    addSignal(signals, signal);
  }
}

function collectRawManifestSignals(
  raw: string,
  signals: Map<string, K8sPrivacySignal>,
) {
  const rawRef: K8sObjectRef = {
    documentIndex: -1,
    apiVersion: undefined,
    kind: undefined,
    name: undefined,
    namespace: undefined,
  };

  if (
    /kind:\s*Secret/iu.test(raw) &&
    /\b(?:data|stringData):\s*(?:\r?\n|$)/iu.test(raw)
  ) {
    addSignal(signals, {
      kind: "secret-data",
      summary:
        "The raw manifest looks like it includes Secret data or stringData fields.",
      fieldPath: "rawInput",
      documentIndex: -1,
      resourceRef: rawRef,
    });
  }

  const rawKinds = dedupeKinds(
    detectSensitiveStringMatches(raw).flatMap((match) => {
      switch (match.kind) {
        case "cloud-credential":
          return ["cloud-credential"] satisfies K8sPrivacySignalKind[];
        case "private-key":
          return ["private-key"] satisfies K8sPrivacySignalKind[];
        case "internal-hostname":
          return ["internal-hostname"] satisfies K8sPrivacySignalKind[];
        case "secret-like":
          return [];
      }
    }),
  );

  for (const kind of rawKinds) {
    addSignal(signals, {
      kind,
      summary: getSignalSummary(kind),
      fieldPath: "rawInput",
      documentIndex: -1,
      resourceRef: rawRef,
    });
  }
}

function redactK8sValue(value: unknown, context: RedactContext): unknown {
  const pathKey = context.path.at(-1);

  if (typeof value === "string") {
    if (isRawManifestPath(context.path)) {
      return redactYamlLikeText(value);
    }

    return redactSensitiveText(value, {
      keyName: typeof pathKey === "string" ? pathKey : undefined,
    });
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      redactK8sValue(entry, {
        ...context,
        path: [...context.path, String(index)],
      }),
    );
  }

  if (!isRecord(value)) {
    return value;
  }

  const kind = typeof value.kind === "string" ? value.kind : undefined;
  const insideSecretObject = context.insideSecretObject || kind === "Secret";
  const sensitiveEnvName =
    typeof value.name === "string" &&
    Object.hasOwn(value, "value") &&
    isSensitiveFieldName(value.name)
      ? value.name
      : undefined;
  const result: Record<string, unknown> = {};

  for (const [keyName, entryValue] of Object.entries(value)) {
    if (
      insideSecretObject &&
      (keyName === "data" || keyName === "stringData") &&
      isRecord(entryValue)
    ) {
      result[keyName] = Object.fromEntries(
        Object.keys(entryValue).map((entryKey) => [
          entryKey,
          REDACTED_SECRET_VALUE,
        ]),
      );
      continue;
    }

    if (keyName === "annotations" && isRecord(entryValue)) {
      result[keyName] = Object.fromEntries(
        Object.entries(entryValue).map(([annotationKey, annotationValue]) => {
          const nextValue =
            isSensitiveAnnotationKey(annotationKey) ||
            hasSensitiveStringMatch(String(annotationValue), {
              keyName: annotationKey,
            })
              ? REDACTED_ANNOTATION_VALUE
              : redactSensitiveText(String(annotationValue), {
                  keyName: annotationKey,
                });

          return [annotationKey, nextValue];
        }),
      );
      continue;
    }

    if (keyName === "value" && sensitiveEnvName && entryValue !== undefined) {
      result[keyName] = REDACTED_ENV_VALUE;
      continue;
    }

    result[keyName] = redactK8sValue(entryValue, {
      path: [...context.path, keyName],
      insideSecretObject,
    });
  }

  return result;
}

function addSignal(
  signals: Map<string, K8sPrivacySignal>,
  signal: K8sPrivacySignal,
) {
  const key = [
    signal.kind,
    signal.documentIndex,
    signal.fieldPath,
    signal.keyName ?? "",
  ].join("|");

  if (!signals.has(key)) {
    signals.set(key, signal);
  }
}

function buildFieldPath(path: string[]) {
  return path.length > 0 ? path.join(".") : "document";
}

function dedupeKinds<T extends string>(kinds: readonly T[]) {
  return [...new Set(kinds)];
}

function formatKindsForSentence(kinds: readonly K8sPrivacySignalKind[]) {
  const labels = kinds.map((kind) => {
    switch (kind) {
      case "secret-data":
        return "Secret data";
      case "secret-string-data":
        return "Secret stringData";
      case "sensitive-env-var":
        return "literal sensitive env vars";
      case "sensitive-annotation":
        return "sensitive annotations";
      case "cloud-credential":
        return "cloud credentials";
      case "private-key":
        return "private keys";
      case "internal-hostname":
        return "internal hostnames";
    }
  });

  return labels.join(", ");
}

function getSignalSummary(kind: K8sPrivacySignalKind, keyName?: string) {
  switch (kind) {
    case "secret-data":
      return `Secret data${keyName ? ` entry "${keyName}"` : ""} is present and treated as sensitive.`;
    case "secret-string-data":
      return `Secret stringData${keyName ? ` entry "${keyName}"` : ""} is present and treated as sensitive.`;
    case "sensitive-env-var":
      return `Environment variable "${keyName ?? "value"}" uses a literal sensitive value.`;
    case "sensitive-annotation":
      return `Annotation "${keyName ?? "value"}" looks sensitive and should stay redacted.`;
    case "cloud-credential":
      return "A cloud credential pattern was detected in the manifest.";
    case "private-key":
      return "A private key marker was detected in the manifest.";
    case "internal-hostname":
      return "An internal hostname or service name was detected in the manifest.";
  }
}

function isRawManifestPath(path: string[]) {
  const joinedPath = path.join(".");
  return (
    joinedPath === "raw" ||
    joinedPath.endsWith(".raw") ||
    joinedPath.endsWith(".input.raw") ||
    joinedPath.endsWith(".rawInput")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
