import { parseK8sYaml } from "@/lib/k8s/parser";
import { analyzeK8sPrivacy } from "@/lib/k8s/privacy";
import { buildK8sRelationshipGraph } from "@/lib/k8s/relationships";
import { k8sRules } from "@/lib/k8s/rules";
import { runK8sRuleEngine } from "@/lib/k8s/rule-engine";
import type {
  K8sAnalysisReport,
  K8sAnalysisProgressUpdate,
  K8sAnalyzerOptions,
  K8sFinding,
  K8sParseResult,
} from "@/lib/k8s/types";

type AnalyzeK8sManifestsExecutionOptions = {
  onProgress?: ((update: K8sAnalysisProgressUpdate) => void) | undefined;
};

export function analyzeK8sManifests(
  raw: string,
  options: K8sAnalyzerOptions = {},
  executionOptions: AnalyzeK8sManifestsExecutionOptions = {},
): K8sAnalysisReport {
  const startedAt = now();
  let parseMs = 0;
  let analyzeMs = 0;
  let parseResult: K8sParseResult | null = null;
  let analyzeStartedAt: number | null = null;

  try {
    executionOptions.onProgress?.({
      stage: "parse",
      progress: 18,
      message: "Analyzing locally...",
    });

    const parseStartedAt = now();
    parseResult = parseK8sYaml(raw);
    parseMs = now() - parseStartedAt;

    executionOptions.onProgress?.({
      stage: "relationships",
      progress: 46,
      message: "Parsed manifests locally. Building relationships...",
    });

    analyzeStartedAt = now();
    const relationshipGraph = buildK8sRelationshipGraph(parseResult.documents);

    executionOptions.onProgress?.({
      stage: "rules",
      progress: 76,
      message: "Running readiness checks locally...",
    });

    const report = runK8sRuleEngine({
      raw,
      parseResult,
      relationshipGraph,
      rules: options.rules ?? k8sRules,
      options,
    });
    const privacy = analyzeK8sPrivacy(raw, parseResult);

    analyzeMs = now() - analyzeStartedAt;

    executionOptions.onProgress?.({
      stage: "finalize",
      progress: 92,
      message: "Finalizing the local analysis report...",
    });

    return attachAnalysisMetadata(
      attachPrivacySummary(report, privacy),
      parseResult,
      parseMs,
      analyzeMs,
      startedAt,
    );
  } catch (error) {
    if (analyzeStartedAt !== null && analyzeMs === 0) {
      analyzeMs = now() - analyzeStartedAt;
    }

    const fallbackParseResult = parseK8sYaml("");
    const fallbackRelationshipGraph = buildK8sRelationshipGraph([]);
    const report = runK8sRuleEngine({
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

    return attachAnalysisMetadata(
      attachPrivacySummary(
        report,
        analyzeK8sPrivacy(raw, parseResult ?? fallbackParseResult),
      ),
      parseResult ?? fallbackParseResult,
      parseMs,
      analyzeMs,
      startedAt,
    );
  }
}

export function analyzeManifestText(
  manifest: string,
  options: K8sAnalyzerOptions = {},
): K8sFinding[] {
  return analyzeK8sManifests(manifest, options).findings;
}

function attachAnalysisMetadata(
  report: K8sAnalysisReport,
  parseResult: K8sParseResult,
  parseMs: number,
  analyzeMs: number,
  startedAt: number,
): K8sAnalysisReport {
  return {
    ...report,
    analysisMetadata: {
      parseMs: roundDuration(parseMs),
      analyzeMs: roundDuration(analyzeMs),
      totalMs: roundDuration(now() - startedAt),
      documentCount: parseResult.input.documentCount,
      inputBytes: parseResult.input.sizeBytes,
    },
  };
}

function attachPrivacySummary(
  report: K8sAnalysisReport,
  privacy: ReturnType<typeof analyzeK8sPrivacy>,
): K8sAnalysisReport {
  return {
    ...report,
    canShareReportSafely:
      report.canShareReportSafely && !privacy.sensitiveDataDetected,
    privacy,
  };
}

function roundDuration(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

function now() {
  return performance.now();
}

export const sampleProductionReadyManifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: authos-demo
  namespace: apps
  labels:
    app.kubernetes.io/name: authos-demo
    app.kubernetes.io/instance: authos-demo-prod
    app.kubernetes.io/component: api
    app.kubernetes.io/part-of: authos
    app.kubernetes.io/managed-by: authos
    team: platform
  annotations:
    owner: platform
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: authos-demo
      app.kubernetes.io/instance: authos-demo-prod
  template:
    metadata:
      labels:
        app.kubernetes.io/name: authos-demo
        app.kubernetes.io/instance: authos-demo-prod
    spec:
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          image: ghcr.io/authos/demo:1.0.0
          ports:
            - name: http
              containerPort: 8080
          readinessProbe:
            httpGet:
              path: /readyz
              port: http
          livenessProbe:
            httpGet:
              path: /livez
              port: http
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              memory: "512Mi"
              cpu: "1000m"
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
            seccompProfile:
              type: RuntimeDefault
---
apiVersion: v1
kind: Service
metadata:
  name: authos-demo
  namespace: apps
  labels:
    app.kubernetes.io/name: authos-demo
    app.kubernetes.io/instance: authos-demo-prod
    app.kubernetes.io/component: api
    app.kubernetes.io/part-of: authos
    app.kubernetes.io/managed-by: authos
    team: platform
  annotations:
    owner: platform
spec:
  selector:
    app.kubernetes.io/name: authos-demo
    app.kubernetes.io/instance: authos-demo-prod
  ports:
    - name: http
      port: 80
      targetPort: http
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: authos-demo-pdb
  namespace: apps
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: authos-demo
      app.kubernetes.io/instance: authos-demo-prod
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: authos-demo-default-deny
  namespace: apps
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress`;

export const sampleBrokenManifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: authos-demo
spec:
  replicas: 1
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
