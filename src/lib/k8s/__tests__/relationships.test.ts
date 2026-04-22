import { describe, expect, it } from "vitest";
import { parseK8sYaml } from "@/lib/k8s/parser";
import { buildK8sRelationshipGraph } from "@/lib/k8s/relationships";
import {
  matchesExpression,
  matchesLabelSelector,
  normalizeLabelSelector,
} from "@/lib/k8s/selectors";

describe("Kubernetes relationship graph", () => {
  it("matches a Service selector to Deployment template labels", () => {
    const graph = buildGraph(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/authos/api:1.0.0
---
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api`);

    expect(graph.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "service-targets",
          sourceRef: expect.objectContaining({ kind: "Service", name: "api" }),
          targetRef: expect.objectContaining({
            kind: "Deployment",
            name: "api",
            namespace: "default",
          }),
        }),
      ]),
    );
    expect(graph.issues).toEqual([]);
  });

  it("reports when a Service selector matches no workloads", () => {
    const graph = buildGraph(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/authos/api:1.0.0
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: web`);

    expect(graph.relationships).toHaveLength(0);
    expect(graph.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "service-selector-matches-nothing",
          sourceRef: expect.objectContaining({ kind: "Service", name: "web" }),
        }),
      ]),
    );
  });

  it("matches a PodDisruptionBudget to a Deployment", () => {
    const graph = buildGraph(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/authos/api:1.0.0
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: api`);

    expect(graph.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "pod-disruption-budget-targets",
          sourceRef: expect.objectContaining({
            kind: "PodDisruptionBudget",
            name: "api-pdb",
          }),
          targetRef: expect.objectContaining({
            kind: "Deployment",
            name: "api",
          }),
        }),
      ]),
    );
  });

  it("resolves an HPA target pointing to a Deployment", () => {
    const graph = buildGraph(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/authos/api:1.0.0
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api`);

    expect(graph.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "horizontal-pod-autoscaler-targets",
          sourceRef: expect.objectContaining({
            kind: "HorizontalPodAutoscaler",
            name: "api-hpa",
          }),
          targetRef: expect.objectContaining({
            kind: "Deployment",
            name: "api",
          }),
        }),
      ]),
    );
  });

  it("reports when an HPA target is missing", () => {
    const graph = buildGraph(`apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: missing-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: missing-deployment`);

    expect(graph.relationships).toHaveLength(0);
    expect(graph.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "hpa-target-not-found",
          sourceRef: expect.objectContaining({
            kind: "HorizontalPodAutoscaler",
            name: "missing-hpa",
          }),
        }),
      ]),
    );
  });

  it("detects a Deployment selector mismatch with template labels", () => {
    const graph = buildGraph(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: mismatch
spec:
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: ghcr.io/authos/web:1.0.0`);

    expect(graph.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "deployment-selector-mismatch",
          severity: "error",
          sourceRef: expect.objectContaining({
            kind: "Deployment",
            name: "mismatch",
          }),
        }),
      ]),
    );
  });

  it("supports matchExpressions In and Exists operators", () => {
    const selector = normalizeLabelSelector({
      matchExpressions: [
        {
          key: "tier",
          operator: "In",
          values: ["api", "worker"],
        },
        {
          key: "track",
          operator: "Exists",
        },
      ],
    });

    if (!selector) {
      throw new Error("Expected selector to normalize.");
    }

    expect(
      matchesLabelSelector(selector, { tier: "api", track: "stable" }),
    ).toBe(true);
    expect(
      matchesLabelSelector(selector, { tier: "web", track: "stable" }),
    ).toBe(false);
    expect(
      matchesExpression(
        {
          key: "track",
          operator: "Exists",
          values: [],
        },
        { track: "stable" },
      ),
    ).toBe(true);
  });

  it("uses default namespace fallback for namespaced resources", () => {
    const graph = buildGraph(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/authos/api:1.0.0
---
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api`);

    expect(graph.namespaces).toEqual(["default"]);
    expect(graph.workloads[0]?.namespace).toBe("default");
    expect(graph.services[0]?.namespace).toBe("default");
    expect(graph.relationships[0]?.namespace).toBe("default");
  });
});

function buildGraph(source: string) {
  const parseResult = parseK8sYaml(source);

  return buildK8sRelationshipGraph(parseResult.documents);
}
