import { parseK8sYaml } from "@/lib/k8s/parser";
import { buildK8sRelationshipGraph } from "@/lib/k8s/relationships";
import { k8sRules } from "@/lib/k8s/rules";
import { runK8sRuleEngine } from "@/lib/k8s/rule-engine";
import type {
  K8sAnalysisReport,
  K8sAnalyzerOptions,
  K8sFinding,
} from "@/lib/k8s/types";

export function analyzeK8sManifests(
  raw: string,
  options: K8sAnalyzerOptions = {},
): K8sAnalysisReport {
  try {
    const parseResult = parseK8sYaml(raw);
    const relationshipGraph = buildK8sRelationshipGraph(parseResult.documents);

    return runK8sRuleEngine({
      raw,
      parseResult,
      relationshipGraph,
      rules: options.rules ?? k8sRules,
      options,
    });
  } catch (error) {
    const fallbackParseResult = parseK8sYaml("");
    const fallbackRelationshipGraph = buildK8sRelationshipGraph([]);

    return runK8sRuleEngine({
      raw,
      parseResult: {
        ...fallbackParseResult,
        ok: false,
        errors: [
          {
            code: "yaml-syntax",
            severity: "error",
            message:
              "The analyzer hit an unexpected error before parsing completed.",
            detail:
              error instanceof Error
                ? error.message
                : "Unknown analyzer failure.",
          },
        ],
      },
      relationshipGraph: fallbackRelationshipGraph,
      rules: [],
      options,
    });
  }
}

export function analyzeManifestText(
  manifest: string,
  options: K8sAnalyzerOptions = {},
): K8sFinding[] {
  return analyzeK8sManifests(manifest, options).findings;
}

export const sampleManifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: authos-demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: authos-demo
  template:
    metadata:
      labels:
        app: authos-demo
    spec:
      containers:
        - name: api
          image: ghcr.io/authos/demo:latest
          ports:
            - containerPort: 8080`;
