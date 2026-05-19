import type { K8sManifestDocument } from "@/lib/k8s/types";
import type { KustomizeDiffCategory, ResourceDiff } from "@/lib/kustomize-diff/types";

export function classifyResourceDiff(input: {
  id: string;
  key: string;
  kind: string;
  namespace: string;
  name: string;
  changeType: ResourceDiff["changeType"];
  leftSummary?: string | undefined;
  rightSummary?: string | undefined;
  document: K8sManifestDocument;
  leftDocument?: K8sManifestDocument;
}): ResourceDiff {
  const serialized = JSON.stringify(input.document.raw);
  const category = detectCategory(serialized, input.kind);
  const summary = buildSummary(input.changeType, input.kind, input.name, category);

  const diff: ResourceDiff = {
    id: input.id,
    key: input.key,
    kind: input.kind,
    namespace: input.namespace,
    name: input.name,
    changeType: input.changeType,
    category,
    summary,
    rightSummary: input.rightSummary,
  };

  if (input.leftSummary !== undefined) {
    diff.leftSummary = input.leftSummary;
  }

  return diff;
}

function detectCategory(serialized: string, kind: string): KustomizeDiffCategory {
  if (/image|repository|tag/u.test(serialized)) {
    return "image";
  }

  if (/readinessProbe|livenessProbe|startupProbe/u.test(serialized)) {
    return "probes";
  }

  if (/resources|limits|requests/u.test(serialized)) {
    return "resources";
  }

  if (/labels|annotations/u.test(serialized)) {
    return "labels";
  }

  if (kind === "Service" || kind === "Ingress" || /type:\s*LoadBalancer/u.test(serialized)) {
    return "exposure";
  }

  return "other";
}

function buildSummary(
  changeType: ResourceDiff["changeType"],
  kind: string,
  name: string,
  category: KustomizeDiffCategory,
) {
  return `${changeType} ${kind}/${name} (${category})`;
}
