import { LineCounter, parse } from "yaml";
import { getInputSizeBytes, YAML_MAX_ALIAS_COUNT } from "@/lib/k8s/errors";
import type { HelmParseResult } from "@/lib/helm/types";

export function parseHelmValuesYaml(raw: string): HelmParseResult {
  const source = raw.trim();
  const sizeBytes = getInputSizeBytes(source);

  if (source.length === 0) {
    return {
      ok: true,
      root: {},
      errors: [],
      sizeBytes,
    };
  }

  try {
    const lineCounter = new LineCounter();
    const document = parse(source, {
      lineCounter,
      maxAliasCount: YAML_MAX_ALIAS_COUNT,
      merge: true,
      strict: false,
    });

    if (document === null || typeof document !== "object" || Array.isArray(document)) {
      return {
        ok: false,
        root: null,
        errors: ["Helm values must be a YAML mapping at the root."],
        sizeBytes,
      };
    }

    return {
      ok: true,
      root: document as Record<string, unknown>,
      errors: [],
      sizeBytes,
    };
  } catch (error) {
    return {
      ok: false,
      root: null,
      errors: [
        error instanceof Error
          ? error.message
          : "The values file could not be parsed.",
      ],
      sizeBytes,
    };
  }
}
