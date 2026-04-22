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
