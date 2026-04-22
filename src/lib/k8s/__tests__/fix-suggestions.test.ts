import { describe, expect, it } from "vitest";
import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import {
  apiVersionK8sRules,
  k8sRules,
  reliabilityK8sRules,
  securityK8sRules,
} from "@/lib/k8s/rules";

function getFindingByRuleId(
  manifest: string,
  ruleId: string,
  rules = k8sRules,
  options: Parameters<typeof analyzeK8sManifests>[1] = {},
) {
  return analyzeK8sManifests(manifest, {
    ...options,
    rules,
  }).findings.find((finding) => finding.ruleId === ruleId);
}

describe("Kubernetes fix suggestions", () => {
  it("generates a new PodDisruptionBudget resource from workload metadata", () => {
    const finding = getFindingByRuleId(
      `apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
  namespace: payments
spec:
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: checkout
      app.kubernetes.io/instance: prod
  template:
    metadata:
      labels:
        app.kubernetes.io/name: checkout
        app.kubernetes.io/instance: prod
    spec:
      containers:
        - name: api
          image: ghcr.io/example/checkout:1.2.3`,
      "missing-pod-disruption-budget",
      reliabilityK8sRules,
    );

    expect(finding?.fix).toMatchObject({
      type: "new-resource",
      title: "Create a PodDisruptionBudget for checkout",
      copyableContent: expect.stringContaining("name: checkout-pdb"),
    });
    expect(finding?.fix?.copyableContent).toContain("namespace: payments");
    expect(finding?.fix?.copyableContent).toContain(
      "app.kubernetes.io/name: checkout",
    );
    expect(finding?.fix?.copyableContent).toContain(
      "app.kubernetes.io/instance: prod",
    );
  });

  it("never includes the original literal secret value in the suggested env fix", () => {
    const manifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: api
    spec:
      containers:
        - name: api
          image: ghcr.io/example/api:1.2.3
          env:
            - name: DATABASE_PASSWORD
              value: super-secret-password-123`;
    const finding = getFindingByRuleId(
      manifest,
      "literal-sensitive-env-var",
      securityK8sRules,
    );
    const serializedFix = JSON.stringify(finding?.fix);

    expect(finding?.fix).toMatchObject({
      type: "yaml-snippet",
      copyableContent: expect.stringContaining("secretKeyRef"),
    });
    expect(serializedFix).not.toContain("super-secret-password-123");
    expect(finding?.fix?.copyableContent).not.toContain(
      "super-secret-password-123",
    );
  });

  it("includes an explicit placeholder warning in probe suggestions", () => {
    const manifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: api
    spec:
      containers:
        - name: api
          image: ghcr.io/example/api:1.2.3
          ports:
            - name: http
              containerPort: 8080`;
    const readiness = getFindingByRuleId(
      manifest,
      "missing-readiness-probe",
      reliabilityK8sRules,
    );
    const liveness = getFindingByRuleId(
      manifest,
      "missing-liveness-probe",
      reliabilityK8sRules,
    );

    expect(readiness?.fix?.copyableContent).toContain(
      "Placeholder only: adjust the endpoint, port, and timing",
    );
    expect(readiness?.fix?.copyableContent).toContain("tcpSocket");
    expect(liveness?.fix?.copyableContent).toContain(
      "Placeholder only: adjust the endpoint, port, and timing",
    );
  });

  it("includes the replacement apiVersion in deprecated API guidance when one is known", () => {
    const finding = getFindingByRuleId(
      `apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: web
spec:
  rules:
    - host: web.example.com
      http:
        paths:
          - path: /
            backend:
              serviceName: web
              servicePort: 80`,
      "deprecated-api-version",
      apiVersionK8sRules,
      {
        kubernetesTargetVersion: "1.24",
      },
    );

    expect(finding?.fix).toMatchObject({
      type: "manual-instruction",
      title: "Plan a migration to networking.k8s.io/v1",
      copyableContent: "apiVersion: networking.k8s.io/v1",
    });
    expect(finding?.fix?.type).toBe("manual-instruction");

    if (finding?.fix?.type !== "manual-instruction") {
      throw new Error("Expected a manual instruction fix suggestion");
    }

    expect(finding.fix.instructions).toContain("networking.k8s.io/v1");
  });

  it("keeps representative fixes stable for golden cases", () => {
    const manifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: prod
  labels:
    app.kubernetes.io/name: api
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: api
    spec:
      containers:
        - name: api
          image: ghcr.io/example/api:latest
          env:
            - name: API_TOKEN
              value: definitely-not-for-output
          ports:
            - name: http
              containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: prod
  labels:
    app.kubernetes.io/name: api
spec:
  selector:
    app: broken
  ports:
    - port: 80
      targetPort: http
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api
  namespace: prod
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 80`;
    const report = analyzeK8sManifests(manifest);
    const selectedRules = new Set([
      "allow-privilege-escalation",
      "ingress-without-tls",
      "literal-sensitive-env-var",
      "missing-liveness-probe",
      "missing-readiness-probe",
      "missing-resource-limits",
      "missing-resource-requests",
      "missing-seccomp-profile",
      "mutable-image-tag",
      "service-selector-matches-nothing",
      "single-replica-deployment",
    ]);
    const fixes = report.findings
      .filter((finding) => selectedRules.has(finding.ruleId))
      .map((finding) => ({
        ruleId: finding.ruleId,
        type: finding.fix?.type,
        title: finding.fix?.title,
        yamlPath: finding.fix?.yamlPath,
        hasPreview: Boolean(finding.fix?.preview),
        copyableContent: finding.fix?.copyableContent
          ?.split("\n")
          .slice(0, 6)
          .join("\n"),
      }))
      .sort((left, right) => left.ruleId.localeCompare(right.ruleId));

    expect(fixes).toMatchInlineSnapshot(`
      [
        {
          "copyableContent": "# Pod-level hardening: use this when every container can inherit the same safer defaults.
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      ",
          "hasPreview": false,
          "ruleId": "allow-privilege-escalation",
          "title": "Add a reviewed securityContext baseline",
          "type": "yaml-snippet",
          "yamlPath": "spec.template.spec.containers[name=api].securityContext.allowPrivilegeEscalation",
        },
        {
          "copyableContent": "# Placeholder only: replace the host and secretName with the certificate mapping your ingress controller actually uses.
      tls:
        - hosts:
            - api.example.com
          secretName: api-example-com-tls",
          "hasPreview": false,
          "ruleId": "ingress-without-tls",
          "title": "Add an Ingress TLS block",
          "type": "yaml-snippet",
          "yamlPath": "spec.tls",
        },
        {
          "copyableContent": "# Template only: create or reference a Secret separately. The original literal value is intentionally not repeated here.
      env:
        - name: API_TOKEN
          valueFrom:
            secretKeyRef:
              name: app-secrets",
          "hasPreview": true,
          "ruleId": "literal-sensitive-env-var",
          "title": "Reference a Secret for API_TOKEN",
          "type": "yaml-snippet",
          "yamlPath": "spec.template.spec.containers[name=api].env[name=API_TOKEN]",
        },
        {
          "copyableContent": "# Placeholder only: adjust the endpoint, port, and timing for your application before using this probe.
      livenessProbe:
        httpGet:
          path: /livez
          port: http
        periodSeconds: 10",
          "hasPreview": false,
          "ruleId": "missing-liveness-probe",
          "title": "Add a liveness probe template",
          "type": "yaml-snippet",
          "yamlPath": "spec.template.spec.containers[name=api].livenessProbe",
        },
        {
          "copyableContent": "# Placeholder only: adjust the endpoint, port, and timing for your application before using this probe.
      readinessProbe:
        httpGet:
          path: /readyz
          port: http
        periodSeconds: 10",
          "hasPreview": false,
          "ruleId": "missing-readiness-probe",
          "title": "Add a readiness probe template",
          "type": "yaml-snippet",
          "yamlPath": "spec.template.spec.containers[name=api].readinessProbe",
        },
        {
          "copyableContent": "# Placeholder values only: tune requests and limits from real usage, latency SLOs, and CPU throttling data.
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:",
          "hasPreview": false,
          "ruleId": "missing-resource-limits",
          "title": "Add resource requests and limits",
          "type": "yaml-snippet",
          "yamlPath": "spec.template.spec.containers[name=api].resources.limits",
        },
        {
          "copyableContent": "# Placeholder values only: tune requests and limits from real usage, latency SLOs, and CPU throttling data.
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:",
          "hasPreview": false,
          "ruleId": "missing-resource-requests",
          "title": "Add resource requests and limits",
          "type": "yaml-snippet",
          "yamlPath": "spec.template.spec.containers[name=api].resources.requests",
        },
        {
          "copyableContent": "# Pod-level hardening: use this when every container can inherit the same safer defaults.
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      ",
          "hasPreview": false,
          "ruleId": "missing-seccomp-profile",
          "title": "Add a reviewed securityContext baseline",
          "type": "yaml-snippet",
          "yamlPath": "spec.template.spec.securityContext.seccompProfile",
        },
        {
          "copyableContent": "# Example only: replace this with the immutable version or digest produced by your release pipeline.
      image: ghcr.io/example/api:1.2.3
      # or
      image: ghcr.io/example/api@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          "hasPreview": true,
          "ruleId": "mutable-image-tag",
          "title": "Pin the image to an immutable tag or digest",
          "type": "manual-instruction",
          "yamlPath": "spec.template.spec.containers[name=api].image",
        },
        {
          "copyableContent": "# JSON Patch-like example: only apply this if Service "api" should target Deployment/api.
      - op: replace
        path: /spec/selector
        value:
          app.kubernetes.io/name: api",
          "hasPreview": true,
          "ruleId": "service-selector-matches-nothing",
          "title": "Patch the selector to target Deployment/api",
          "type": "json-patch-like",
          "yamlPath": "spec.selector",
        },
        {
          "copyableContent": "# Patch-like example: confirm capacity, autoscaling behavior, and disruption budgets before scaling to 2 replicas.
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: api
        namespace: prod",
          "hasPreview": true,
          "ruleId": "single-replica-deployment",
          "title": "Scale the Deployment to 2 replicas",
          "type": "strategic-merge-patch-like",
          "yamlPath": "spec.replicas",
        },
      ]
    `);
  });
});
