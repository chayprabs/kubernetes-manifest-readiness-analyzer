import { parseK8sYaml } from "@/lib/k8s/parser";
import type { K8sManifestDocument } from "@/lib/k8s/types";
import { classifyResourceDiff } from "@/lib/kustomize-diff/classify";
import type { KustomizeDiffReport, ResourceDiff } from "@/lib/kustomize-diff/types";

export function compareKustomizeOutputs(
  leftRaw: string,
  rightRaw: string,
): KustomizeDiffReport {
  const leftParse = parseK8sYaml(leftRaw);
  const rightParse = parseK8sYaml(rightRaw);
  const parseErrors: KustomizeDiffReport["parseErrors"] = [];

  if (!leftParse.ok) {
    parseErrors.push({
      side: "left",
      messages: leftParse.errors.map((error) => error.message),
    });
  }

  if (!rightParse.ok) {
    parseErrors.push({
      side: "right",
      messages: rightParse.errors.map((error) => error.message),
    });
  }

  if (parseErrors.length > 0) {
    const sides = parseErrors.map((entry) => entry.side).join(" and ");
    return {
      ok: false,
      message: `Fix YAML parse errors on the ${sides} overlay before comparing.`,
      summary: "Parse blockers prevent a reliable diff.",
      leftDocumentCount: leftParse.documents.length,
      rightDocumentCount: rightParse.documents.length,
      added: [],
      removed: [],
      changed: [],
      parseErrors,
    };
  }

  const leftMap = indexDocuments(leftParse.documents);
  const rightMap = indexDocuments(rightParse.documents);
  const added: ResourceDiff[] = [];
  const removed: ResourceDiff[] = [];
  const changed: ResourceDiff[] = [];

  for (const [key, rightDoc] of rightMap.entries()) {
    const leftDoc = leftMap.get(key);
    if (!leftDoc) {
      added.push(buildDiff("added", rightDoc, key));
      continue;
    }

    if (stableHash(leftDoc.raw) !== stableHash(rightDoc.raw)) {
      changed.push(buildDiff("changed", rightDoc, key, leftDoc));
    }
  }

  for (const [key, leftDoc] of leftMap.entries()) {
    if (!rightMap.has(key)) {
      removed.push(buildDiff("removed", leftDoc, key));
    }
  }

  const summary = `Compared ${leftMap.size} left resources with ${rightMap.size} right resources: ${added.length} added, ${removed.length} removed, ${changed.length} changed.`;

  return {
    ok: true,
    message: "Kustomize output diff is ready for review.",
    summary,
    leftDocumentCount: leftParse.documents.length,
    rightDocumentCount: rightParse.documents.length,
    added,
    removed,
    changed,
    parseErrors,
  };
}

function indexDocuments(documents: K8sManifestDocument[]) {
  const map = new Map<string, K8sManifestDocument>();

  for (const document of documents) {
    if (!document.kind || !document.metadata.name) {
      continue;
    }

    const namespace = document.metadata.namespace ?? "default";
    map.set(`${document.kind}/${namespace}/${document.metadata.name}`, document);
  }

  return map;
}

function buildDiff(
  changeType: ResourceDiff["changeType"],
  document: K8sManifestDocument,
  key: string,
  leftDocument?: K8sManifestDocument,
): ResourceDiff {
  const [kind = "Unknown", namespace = "default", name = "unknown"] = key.split("/");
  return classifyResourceDiff({
    id: `${changeType}:${key}`,
    key,
    kind,
    namespace,
    name,
    changeType,
    ...(leftDocument
      ? {
          leftSummary: `${leftDocument.apiVersion ?? "?"} ${leftDocument.kind}/${name}`,
          leftDocument,
        }
      : {}),
    rightSummary: `${document.apiVersion ?? "?"} ${document.kind}/${name}`,
    document,
  });
}

function stableHash(value: unknown) {
  return JSON.stringify(value);
}
