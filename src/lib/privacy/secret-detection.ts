export type SensitiveStringMatchKind =
  | "secret-like"
  | "cloud-credential"
  | "private-key"
  | "internal-hostname";

export type SensitiveStringMatch = {
  kind: SensitiveStringMatchKind;
  placeholder: string;
};

type SensitiveTextPattern = {
  kind: SensitiveStringMatchKind;
  placeholder: string;
  regex: RegExp;
};

export const sensitiveFieldNamePattern =
  /(^|_)(password|passwd|secret|token|api[_-]?key|access[_-]?key|secret[_-]?key|private[_-]?key|client[_-]?secret|credentials|jwt)(_|$)/i;

export const sensitiveAnnotationKeyPattern =
  /(^|[./_-])(token|password|secret|api[_-]?key|private[_-]?key|client[_-]?secret|credentials)([./_-]|$)/i;

export const internalHostnamePattern =
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\.svc(?:\.cluster\.local)?|\.internal|\.corp|\.local)\b/giu;

export const sensitiveTextPatterns: readonly SensitiveTextPattern[] = [
  {
    kind: "private-key",
    placeholder: "[REDACTED PRIVATE KEY]",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/gu,
  },
  {
    kind: "cloud-credential",
    placeholder: "[REDACTED CLOUD CREDENTIAL]",
    regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/gu,
  },
  {
    kind: "cloud-credential",
    placeholder: "[REDACTED CLOUD CREDENTIAL]",
    regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/gu,
  },
  {
    kind: "cloud-credential",
    placeholder: "[REDACTED CLOUD CREDENTIAL]",
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/gu,
  },
  {
    kind: "cloud-credential",
    placeholder: "[REDACTED CLOUD CREDENTIAL]",
    regex: /\bAccountKey=[A-Za-z0-9+/=]{20,}\b/giu,
  },
  {
    kind: "internal-hostname",
    placeholder: "[REDACTED INTERNAL HOST]",
    regex: internalHostnamePattern,
  },
];

export function isSensitiveFieldName(name: string) {
  return sensitiveFieldNamePattern.test(name.trim());
}

export function isSensitiveAnnotationKey(name: string) {
  return sensitiveAnnotationKeyPattern.test(name.trim());
}

export function detectSensitiveStringMatches(
  value: string,
  options: {
    keyName?: string | undefined;
  } = {},
) {
  const matches: SensitiveStringMatch[] = [];
  const trimmedValue = value.trim();
  const keyName = options.keyName?.trim();

  if (trimmedValue.length === 0) {
    return matches;
  }

  if (keyName && isSensitiveFieldName(keyName)) {
    matches.push({
      kind: "secret-like",
      placeholder: "[REDACTED SECRET]",
    });
  }

  if (keyName && isSensitiveAnnotationKey(keyName)) {
    matches.push({
      kind: "secret-like",
      placeholder: "[REDACTED ANNOTATION]",
    });
  }

  for (const pattern of sensitiveTextPatterns) {
    if (cloneRegExp(pattern.regex).test(value)) {
      matches.push({
        kind: pattern.kind,
        placeholder: pattern.placeholder,
      });
    }
  }

  return dedupeMatches(matches);
}

export function hasSensitiveStringMatch(
  value: string,
  options: {
    keyName?: string | undefined;
  } = {},
) {
  return detectSensitiveStringMatches(value, options).length > 0;
}

function dedupeMatches(matches: SensitiveStringMatch[]) {
  const seen = new Set<string>();

  return matches.filter((match) => {
    const key = `${match.kind}:${match.placeholder}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function cloneRegExp(value: RegExp) {
  return new RegExp(value.source, value.flags);
}
