import {
  detectSensitiveStringMatches,
  isSensitiveAnnotationKey,
  isSensitiveFieldName,
  sensitiveTextPatterns,
} from "@/lib/privacy/secret-detection";

export const REDACTED_SECRET_VALUE = "[REDACTED SECRET]";
export const REDACTED_ENV_VALUE = "[REDACTED ENV VALUE]";
export const REDACTED_ANNOTATION_VALUE = "[REDACTED ANNOTATION]";

export function redactSensitiveText(
  value: string,
  options: {
    keyName?: string | undefined;
  } = {},
) {
  const keyName = options.keyName?.trim();
  const matches = detectSensitiveStringMatches(value, { keyName });

  if (matches.length === 0) {
    return value;
  }

  if (keyName && isSensitiveAnnotationKey(keyName)) {
    return REDACTED_ANNOTATION_VALUE;
  }

  let redactedValue = value;

  for (const pattern of sensitiveTextPatterns) {
    redactedValue = redactedValue.replaceAll(
      cloneRegExp(pattern.regex),
      pattern.placeholder,
    );
  }

  if (redactedValue !== value) {
    return redactedValue;
  }

  return matches[0]?.placeholder ?? REDACTED_SECRET_VALUE;
}

export function redactYamlLikeText(value: string) {
  const lines = value.split(/\r?\n/u);
  const redactedLines: string[] = [];
  let isInsideSecret = false;
  let secretBlockIndent: number | null = null;
  let annotationsIndent: number | null = null;
  let sensitiveEnvIndent: number | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;

    if (/^kind:\s*Secret\s*$/u.test(trimmed)) {
      isInsideSecret = true;
    } else if (
      /^kind:\s*\S+/u.test(trimmed) &&
      !/^kind:\s*Secret\s*$/u.test(trimmed)
    ) {
      isInsideSecret = false;
    }

    if (
      secretBlockIndent !== null &&
      trimmed.length > 0 &&
      indent <= secretBlockIndent
    ) {
      secretBlockIndent = null;
    }

    if (
      annotationsIndent !== null &&
      trimmed.length > 0 &&
      indent <= annotationsIndent
    ) {
      annotationsIndent = null;
    }

    if (
      sensitiveEnvIndent !== null &&
      trimmed.length > 0 &&
      indent <= sensitiveEnvIndent
    ) {
      sensitiveEnvIndent = null;
    }

    if (isInsideSecret && /^(\s*)(data|stringData):\s*$/u.test(line)) {
      secretBlockIndent = indent;
      redactedLines.push(line);
      continue;
    }

    if (
      secretBlockIndent !== null &&
      trimmed.length > 0 &&
      indent > secretBlockIndent
    ) {
      const match = line.match(/^(\s*[^:#]+:\s*).+$/u);
      redactedLines.push(match ? `${match[1]}${REDACTED_SECRET_VALUE}` : line);
      continue;
    }

    if (/^(\s*)annotations:\s*$/u.test(line)) {
      annotationsIndent = indent;
      redactedLines.push(line);
      continue;
    }

    if (
      annotationsIndent !== null &&
      trimmed.length > 0 &&
      indent > annotationsIndent
    ) {
      const annotationMatch = line.match(/^(\s*[^:#]+:\s*)(.+)$/u);
      const annotationPrefix = annotationMatch?.[1];
      const annotationValue = annotationMatch?.[2];

      if (annotationPrefix && annotationValue) {
        const keyName =
          annotationPrefix.trim().slice(0, -1).trim().split(/\s+/u).at(-1) ??
          "";

        redactedLines.push(
          `${annotationPrefix}${redactSensitiveText(annotationValue, {
            keyName,
          })}`,
        );
        continue;
      }
    }

    const envNameMatch = line.match(
      /^\s*-\s*name:\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/u,
    );
    const envName = envNameMatch?.[1];

    if (envName && isSensitiveFieldName(envName)) {
      sensitiveEnvIndent = indent;
      redactedLines.push(line);
      continue;
    }

    if (
      sensitiveEnvIndent !== null &&
      indent > sensitiveEnvIndent &&
      /^\s*value:\s*.+$/u.test(line)
    ) {
      const envValueMatch = line.match(/^(\s*value:\s*).+$/u);
      const envValuePrefix = envValueMatch?.[1];

      redactedLines.push(
        envValuePrefix ? `${envValuePrefix}${REDACTED_ENV_VALUE}` : line,
      );
      continue;
    }

    redactedLines.push(redactSensitiveText(line));
  }

  return redactedLines.join("\n");
}

function cloneRegExp(value: RegExp) {
  return new RegExp(value.source, value.flags);
}
