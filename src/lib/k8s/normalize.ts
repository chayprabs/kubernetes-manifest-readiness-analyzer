import { isNode } from "yaml";
import type { Document, LineCounter, ParsedNode } from "yaml";
import {
  createMissingFieldError,
  createParseError,
  createSourceLocationFromRange,
  extractLineSnippet,
  YAML_MAX_ALIAS_COUNT,
} from "@/lib/k8s/errors";
import type {
  K8sEmptyDocument,
  K8sFieldLocationKey,
  K8sManifestDocument,
  K8sMetadata,
  K8sObjectRef,
  K8sParseError,
  K8sResourceKind,
  K8sSourceLocation,
} from "@/lib/k8s/types";

type NormalizeK8sDocumentInput = {
  document: Document.Parsed<ParsedNode>;
  documentIndex: number;
  lineCounter: LineCounter;
  source: string;
};

type NormalizeK8sDocumentResult = {
  document?: K8sManifestDocument;
  emptyDocument?: K8sEmptyDocument;
  errors: K8sParseError[];
};

export function normalizeK8sDocument({
  document,
  documentIndex,
  lineCounter,
  source,
}: NormalizeK8sDocumentInput): NormalizeK8sDocumentResult {
  const documentLocation =
    createSourceLocationFromRange(
      document.contents?.range ?? document.range,
      lineCounter,
    ) ?? createFallbackLocation(lineCounter);

  if (isEmptyYamlDocument(document, source)) {
    return {
      emptyDocument: {
        index: documentIndex,
        location: documentLocation,
      },
      errors: [],
    };
  }

  let resolvedValue: unknown;

  try {
    resolvedValue = document.toJS({
      maxAliasCount: YAML_MAX_ALIAS_COUNT,
    });
  } catch (error) {
    return {
      errors: [
        createParseError({
          code: "yaml-syntax",
          message: `Document ${documentIndex + 1} could not be resolved safely.`,
          detail:
            error instanceof Error
              ? error.message
              : "Anchors or aliases expanded beyond the safe parser limit.",
          documentIndex,
          location: documentLocation,
          snippet: extractLineSnippet(source, documentLocation.offset),
        }),
      ],
    };
  }

  if (!isPlainObject(resolvedValue)) {
    return {
      errors: [
        createParseError({
          code: "non-object-document",
          message: `Document ${documentIndex + 1} must be a YAML object with Kubernetes fields like apiVersion, kind, and metadata.name.`,
          detail: `This document resolved to ${describeValue(resolvedValue)} instead.`,
          documentIndex,
          location: documentLocation,
          snippet: extractLineSnippet(source, documentLocation.offset),
        }),
      ],
    };
  }

  const raw = resolvedValue;
  const metadataRecord = toRecord(raw.metadata);
  const apiVersion = toNonEmptyString(raw.apiVersion);
  const kind = toNonEmptyString(raw.kind) as K8sResourceKind | undefined;
  const metadata: K8sMetadata = {
    name: toNonEmptyString(metadataRecord?.name),
    namespace: toNonEmptyString(metadataRecord?.namespace),
    labels: toStringRecord(metadataRecord?.labels),
    annotations: toStringRecord(metadataRecord?.annotations),
  };
  const objectRef: K8sObjectRef = {
    documentIndex,
    apiVersion,
    kind,
    name: metadata.name,
    namespace: metadata.namespace,
  };
  const fieldLocations = collectFieldLocations(document, lineCounter);
  const normalizedDocument: K8sManifestDocument = {
    index: documentIndex,
    apiVersion,
    kind,
    metadata,
    spec: toRecord(raw.spec),
    raw,
    objectRef,
    location: documentLocation,
    fieldLocations,
  };
  const errors: K8sParseError[] = [];

  if (!apiVersion) {
    errors.push(
      createMissingFieldError({
        documentIndex,
        field: "apiVersion",
        location: fieldLocations.apiVersion ?? documentLocation,
        ref: objectRef,
      }),
    );
  }

  if (!kind) {
    errors.push(
      createMissingFieldError({
        documentIndex,
        field: "kind",
        location: fieldLocations.kind ?? documentLocation,
        ref: objectRef,
      }),
    );
  }

  if (!metadata.name) {
    errors.push(
      createMissingFieldError({
        documentIndex,
        field: "metadata.name",
        location:
          fieldLocations["metadata.name"] ??
          fieldLocations.metadata ??
          documentLocation,
        ref: objectRef,
      }),
    );
  }

  return {
    document: normalizedDocument,
    errors,
  };
}

export function isEmptyYamlDocument(
  document: Document.Parsed<ParsedNode>,
  source: string,
) {
  const range = document.contents?.range ?? document.range;

  if (!range) {
    return false;
  }

  return source.slice(range[0], range[2]).trim().length === 0;
}

function collectFieldLocations(
  document: Document.Parsed<ParsedNode>,
  lineCounter: LineCounter,
) {
  const fieldLocations: Partial<
    Record<K8sFieldLocationKey, K8sSourceLocation>
  > = {};

  assignFieldLocation(
    fieldLocations,
    "apiVersion",
    getNodeLocation(document.get("apiVersion", true), lineCounter),
  );
  assignFieldLocation(
    fieldLocations,
    "kind",
    getNodeLocation(document.get("kind", true), lineCounter),
  );
  assignFieldLocation(
    fieldLocations,
    "metadata",
    getNodeLocation(document.get("metadata", true), lineCounter),
  );
  assignFieldLocation(
    fieldLocations,
    "metadata.name",
    getNodeLocation(document.getIn(["metadata", "name"], true), lineCounter),
  );
  assignFieldLocation(
    fieldLocations,
    "metadata.namespace",
    getNodeLocation(
      document.getIn(["metadata", "namespace"], true),
      lineCounter,
    ),
  );
  assignFieldLocation(
    fieldLocations,
    "metadata.labels",
    getNodeLocation(document.getIn(["metadata", "labels"], true), lineCounter),
  );
  assignFieldLocation(
    fieldLocations,
    "metadata.annotations",
    getNodeLocation(
      document.getIn(["metadata", "annotations"], true),
      lineCounter,
    ),
  );
  assignFieldLocation(
    fieldLocations,
    "spec",
    getNodeLocation(document.get("spec", true), lineCounter),
  );

  return fieldLocations;
}

function assignFieldLocation(
  fieldLocations: Partial<Record<K8sFieldLocationKey, K8sSourceLocation>>,
  key: K8sFieldLocationKey,
  location: K8sSourceLocation | undefined,
) {
  if (location) {
    fieldLocations[key] = location;
  }
}

function getNodeLocation(node: unknown, lineCounter: LineCounter) {
  if (!isNode(node)) {
    return undefined;
  }

  return createSourceLocationFromRange(node.range, lineCounter);
}

function createFallbackLocation(lineCounter: LineCounter) {
  return {
    offset: 0,
    line: lineCounter.linePos(0).line,
    column: lineCounter.linePos(0).col,
    endOffset: 0,
    endLine: lineCounter.linePos(0).line,
    endColumn: lineCounter.linePos(0).col,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return isPlainObject(value) ? value : undefined;
}

function toNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function toStringRecord(value: unknown) {
  if (!isPlainObject(value)) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof entryValue === "string") {
      result[key] = entryValue;
      continue;
    }

    if (
      typeof entryValue === "number" ||
      typeof entryValue === "boolean" ||
      typeof entryValue === "bigint"
    ) {
      result[key] = String(entryValue);
    }
  }

  return result;
}

function describeValue(value: unknown) {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "a YAML sequence";
  }

  return typeof value === "string" ? "a string" : `a ${typeof value}`;
}
