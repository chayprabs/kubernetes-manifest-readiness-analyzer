import type {
  K8sLabelMatchExpression,
  K8sLabelSelector,
  K8sLabelSelectorOperator,
} from "@/lib/k8s/types";

export function normalizeLabelSelector(
  value: unknown,
): K8sLabelSelector | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  return {
    matchLabels: toStringRecord(value.matchLabels),
    matchExpressions: toMatchExpressions(value.matchExpressions),
  };
}

export function selectorFromLabelMap(
  value: unknown,
): K8sLabelSelector | undefined {
  const matchLabels = toStringRecord(value);

  return Object.keys(matchLabels).length > 0
    ? {
        matchLabels,
        matchExpressions: [],
      }
    : undefined;
}

export function matchesLabelSelector(
  selector: K8sLabelSelector,
  labels: Record<string, string>,
) {
  for (const [key, expected] of Object.entries(selector.matchLabels)) {
    if (labels[key] !== expected) {
      return false;
    }
  }

  return selector.matchExpressions.every((expression) =>
    matchesExpression(expression, labels),
  );
}

export function hasSelectorTerms(selector: K8sLabelSelector | undefined) {
  if (!selector) {
    return false;
  }

  return (
    Object.keys(selector.matchLabels).length > 0 ||
    selector.matchExpressions.length > 0
  );
}

export function matchesExpression(
  expression: K8sLabelMatchExpression,
  labels: Record<string, string>,
) {
  const hasKey = Object.hasOwn(labels, expression.key);
  const labelValue = hasKey ? labels[expression.key] : undefined;

  switch (expression.operator) {
    case "In":
      return labelValue !== undefined && expression.values.includes(labelValue);
    case "NotIn":
      return (
        labelValue === undefined || !expression.values.includes(labelValue)
      );
    case "Exists":
      return hasKey;
    case "DoesNotExist":
      return !hasKey;
  }
}

function toMatchExpressions(value: unknown): K8sLabelMatchExpression[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const expressions: K8sLabelMatchExpression[] = [];

  for (const item of value) {
    if (!isPlainObject(item)) {
      continue;
    }

    const key = toNonEmptyString(item.key);
    const operator = toOperator(item.operator);

    if (!key || !operator) {
      continue;
    }

    expressions.push({
      key,
      operator,
      values: toStringArray(item.values),
    });
  }

  return expressions;
}

function toOperator(value: unknown): K8sLabelSelectorOperator | undefined {
  return value === "In" ||
    value === "NotIn" ||
    value === "Exists" ||
    value === "DoesNotExist"
    ? value
    : undefined;
}

function toStringRecord(value: unknown) {
  if (!isPlainObject(value)) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const [key, entry] of Object.entries(value)) {
    const normalized = toNonEmptyString(entry);

    if (normalized) {
      result[key] = normalized;
    }
  }

  return result;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toNonEmptyString(item))
    .filter((item): item is string => item !== undefined);
}

function toNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
