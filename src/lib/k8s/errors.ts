import type { ErrorCode as YamlErrorCode, LineCounter, YAMLError } from "yaml";
import type {
  K8sObjectRef,
  K8sParseError,
  K8sParseErrorCode,
  K8sSourceLocation,
} from "@/lib/k8s/types";

export const RECOMMENDED_MAX_PASTE_BYTES = 2 * 1024 * 1024;
export const YAML_MAX_ALIAS_COUNT = 100;

type CreateParseErrorInput = {
  code: K8sParseErrorCode;
  message: string;
  severity?: "error" | "warning";
  detail?: string | undefined;
  documentIndex?: number | undefined;
  path?: string | undefined;
  location?: K8sSourceLocation | undefined;
  snippet?: string | undefined;
  ref?: K8sObjectRef | undefined;
  yamlCode?: string | undefined;
};

type CreateYamlDiagnosticInput = {
  error: Pick<YAMLError, "code" | "message" | "pos">;
  documentIndex: number;
  lineCounter: LineCounter;
  source: string;
  severity?: "error" | "warning";
  code?: K8sParseErrorCode;
};

type CreateMissingFieldErrorInput = {
  documentIndex: number;
  field: "apiVersion" | "kind" | "metadata.name";
  location?: K8sSourceLocation | undefined;
  ref: K8sObjectRef;
};

export function getInputSizeBytes(input: string) {
  return new TextEncoder().encode(input).length;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createSourceLocation(
  startOffset: number,
  endOffset: number,
  lineCounter: LineCounter,
): K8sSourceLocation {
  const start = lineCounter.linePos(startOffset);
  const end = lineCounter.linePos(endOffset);

  return {
    offset: startOffset,
    line: start.line,
    column: start.col,
    endOffset,
    endLine: end.line,
    endColumn: end.col,
  };
}

export function createSourceLocationFromRange(
  range: readonly [number, number, number] | undefined | null,
  lineCounter: LineCounter,
) {
  if (!range) {
    return undefined;
  }

  return createSourceLocation(range[0], range[2], lineCounter);
}

export function extractLineSnippet(source: string, offset: number) {
  const safeOffset = Math.max(0, Math.min(offset, source.length));
  const lineStart = source.lastIndexOf("\n", safeOffset - 1) + 1;
  const lineEndIndex = source.indexOf("\n", safeOffset);
  const lineEnd = lineEndIndex === -1 ? source.length : lineEndIndex;
  const snippet = source.slice(lineStart, lineEnd);

  return snippet.length > 0 ? snippet : undefined;
}

export function createParseError({
  code,
  message,
  severity = "error",
  detail,
  documentIndex,
  path,
  location,
  snippet,
  ref,
  yamlCode,
}: CreateParseErrorInput): K8sParseError {
  const error: K8sParseError = {
    code,
    severity,
    message,
  };

  if (detail) {
    error.detail = detail;
  }

  if (documentIndex !== undefined) {
    error.documentIndex = documentIndex;
  }

  if (path) {
    error.path = path;
  }

  if (location) {
    error.location = location;
  }

  if (snippet) {
    error.snippet = snippet;
  }

  if (ref) {
    error.ref = ref;
  }

  if (yamlCode) {
    error.yamlCode = yamlCode;
  }

  return error;
}

export function createYamlDiagnostic({
  error,
  documentIndex,
  lineCounter,
  source,
  severity = "error",
  code = severity === "warning" ? "yaml-warning" : "yaml-syntax",
}: CreateYamlDiagnosticInput): K8sParseError {
  const location = createSourceLocation(
    error.pos[0],
    error.pos[1],
    lineCounter,
  );
  const compactMessage = toSentence(stripYamlLocation(error.message));

  return createParseError({
    code,
    severity,
    message:
      severity === "warning"
        ? `YAML warning in document ${documentIndex + 1}: ${compactMessage}`
        : `YAML syntax error in document ${documentIndex + 1}: ${compactMessage}`,
    detail: error.message.trim(),
    documentIndex,
    location,
    snippet: extractLineSnippet(source, error.pos[0]),
    yamlCode: error.code,
  });
}

export function createMissingFieldError({
  documentIndex,
  field,
  location,
  ref,
}: CreateMissingFieldErrorInput): K8sParseError {
  return createParseError({
    code: toMissingFieldCode(field),
    message: `Document ${documentIndex + 1} is missing required field "${field}".`,
    detail:
      'Kubernetes resources need "apiVersion", "kind", and "metadata.name" before the analyzer can score them reliably.',
    documentIndex,
    path: field,
    location,
    ref,
  });
}

export function createInputTooLargeWarning(sizeBytes: number): K8sParseError {
  return createParseError({
    code: "input-too-large",
    severity: "warning",
    message: `Input is ${formatBytes(sizeBytes)}, above the recommended ${formatBytes(RECOMMENDED_MAX_PASTE_BYTES)} limit for instant local analysis.`,
    detail:
      "Parsing still runs, but the UI should warn that large pasted manifests may feel slower in the browser.",
  });
}

export function createUnexpectedParserError(
  error: unknown,
  source: string,
): K8sParseError {
  const detail =
    error instanceof Error
      ? error.message
      : "Unknown parser failure while reading YAML input.";

  return createParseError({
    code: "yaml-syntax",
    message: "The YAML input could not be parsed safely.",
    detail,
    snippet: extractLineSnippet(source, 0),
  });
}

function stripYamlLocation(message: string) {
  const firstLine = message.split("\n")[0] ?? message;
  return firstLine.replace(/ at line \d+, column \d+:?$/u, "").trim();
}

function toSentence(message: string) {
  return /[.!?]$/u.test(message) ? message : `${message}.`;
}

function toMissingFieldCode(
  field: CreateMissingFieldErrorInput["field"],
): Extract<
  K8sParseErrorCode,
  "missing-api-version" | "missing-kind" | "missing-metadata-name"
> {
  switch (field) {
    case "apiVersion":
      return "missing-api-version";
    case "kind":
      return "missing-kind";
    case "metadata.name":
      return "missing-metadata-name";
  }
}

export type { YamlErrorCode };
