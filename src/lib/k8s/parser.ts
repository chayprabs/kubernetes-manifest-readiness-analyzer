import { LineCounter, parseAllDocuments } from "yaml";
import {
  createInputTooLargeWarning,
  createUnexpectedParserError,
  createYamlDiagnostic,
  getInputSizeBytes,
  RECOMMENDED_MAX_PASTE_BYTES,
  YAML_MAX_ALIAS_COUNT,
} from "@/lib/k8s/errors";
import { normalizeK8sDocument } from "@/lib/k8s/normalize";
import type {
  K8sEmptyDocument,
  K8sManifestDocument,
  K8sParseError,
  K8sParseResult,
} from "@/lib/k8s/types";

const YAML_PARSE_OPTIONS = {
  merge: true,
  maxAliasCount: YAML_MAX_ALIAS_COUNT,
  prettyErrors: false,
  strict: false,
} as const;

export function parseK8sYaml(rawInput: string): K8sParseResult {
  const source = typeof rawInput === "string" ? rawInput : String(rawInput);
  const lineCounter = new LineCounter();
  const sizeBytes = getInputSizeBytes(source);
  const documents: K8sManifestDocument[] = [];
  const errors: K8sParseError[] = [];
  const warnings: K8sParseError[] = [];
  const emptyDocuments: K8sEmptyDocument[] = [];
  let parsedDocumentCount = 0;

  if (sizeBytes > RECOMMENDED_MAX_PASTE_BYTES) {
    warnings.push(createInputTooLargeWarning(sizeBytes));
  }

  try {
    const yamlDocuments = parseAllDocuments(source, {
      ...YAML_PARSE_OPTIONS,
      lineCounter,
    });
    parsedDocumentCount = yamlDocuments.length;

    yamlDocuments.forEach((document, documentIndex) => {
      if (document.errors.length > 0) {
        errors.push(
          ...document.errors.map((error) =>
            createYamlDiagnostic({
              error,
              documentIndex,
              lineCounter,
              source,
            }),
          ),
        );
        return;
      }

      if (document.warnings.length > 0) {
        warnings.push(
          ...document.warnings.map((warning) =>
            createYamlDiagnostic({
              error: warning,
              documentIndex,
              lineCounter,
              source,
              severity: "warning",
            }),
          ),
        );
      }

      const normalized = normalizeK8sDocument({
        document,
        documentIndex,
        lineCounter,
        source,
      });

      if (normalized.emptyDocument) {
        emptyDocuments.push(normalized.emptyDocument);
      }

      if (normalized.document) {
        documents.push(normalized.document);
      }

      if (normalized.errors.length > 0) {
        errors.push(...normalized.errors);
      }
    });
  } catch (error) {
    errors.push(createUnexpectedParserError(error, source));
  }

  return {
    ok: errors.length === 0,
    documents,
    errors,
    warnings,
    emptyDocuments,
    input: {
      raw: source,
      sizeBytes,
      recommendedMaxBytes: RECOMMENDED_MAX_PASTE_BYTES,
      documentCount: parsedDocumentCount,
      documents,
      emptyDocumentCount: emptyDocuments.length,
    },
  };
}
