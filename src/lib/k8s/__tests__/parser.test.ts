import { describe, expect, it } from "vitest";
import { parseK8sYaml } from "@/lib/k8s/parser";

describe("parseK8sYaml", () => {
  it("parses a single valid Deployment", () => {
    const result = parseK8sYaml(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: authos-api
  namespace: platform
  labels:
    app: authos
spec:
  replicas: 2`);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({
      index: 0,
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: {
        name: "authos-api",
        namespace: "platform",
        labels: {
          app: "authos",
        },
      },
      spec: {
        replicas: 2,
      },
    });
    expect(result.documents[0]?.location.line).toBe(1);
  });

  it("parses multi-document Deployment and Service YAML", () => {
    const result = parseK8sYaml(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: authos-api
---
apiVersion: v1
kind: Service
metadata:
  name: authos-api
  namespace: platform`);

    expect(result.ok).toBe(true);
    expect(result.documents).toHaveLength(2);
    expect(result.documents.map((document) => document.kind)).toEqual([
      "Deployment",
      "Service",
    ]);
    expect(result.documents[1]?.metadata.namespace).toBe("platform");
  });

  it("ignores empty documents while tracking their positions", () => {
    const result = parseK8sYaml(`apiVersion: v1
kind: ConfigMap
metadata:
  name: first
---

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: second`);

    expect(result.ok).toBe(true);
    expect(result.documents).toHaveLength(2);
    expect(result.emptyDocuments).toHaveLength(1);
    expect(result.emptyDocuments[0]).toMatchObject({
      index: 1,
    });
    expect(result.input.emptyDocumentCount).toBe(1);
  });

  it("returns friendly YAML syntax errors for invalid indentation", () => {
    const result = parseK8sYaml(`apiVersion: apps/v1
kind: Deployment
metadata:
\tname: broken`);

    expect(result.ok).toBe(false);
    expect(result.documents).toHaveLength(0);
    expect(result.errors[0]).toMatchObject({
      code: "yaml-syntax",
      documentIndex: 0,
      yamlCode: "TAB_AS_INDENT",
    });
    expect(result.errors[0]?.message).toContain("YAML syntax error");
    expect(result.errors[0]?.location).toMatchObject({
      line: 4,
      column: 1,
    });
  });

  it("reports missing kind without dropping the parsed object", () => {
    const result = parseK8sYaml(`apiVersion: apps/v1
metadata:
  name: missing-kind`);

    expect(result.ok).toBe(false);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.metadata.name).toBe("missing-kind");
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-kind",
          documentIndex: 0,
          path: "kind",
        }),
      ]),
    );
  });

  it("rejects non-object YAML documents like plain strings", () => {
    const result = parseK8sYaml(`just-a-string`);

    expect(result.ok).toBe(false);
    expect(result.documents).toHaveLength(0);
    expect(result.errors[0]).toMatchObject({
      code: "non-object-document",
      documentIndex: 0,
    });
    expect(result.errors[0]?.detail).toContain("string");
  });

  it("supports YAML anchors in metadata labels", () => {
    const result = parseK8sYaml(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: anchored-labels
  labels: &sharedLabels
    app: authos
    tier: api
spec:
  template:
    metadata:
      labels: *sharedLabels`);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.documents[0]?.metadata.labels).toEqual({
      app: "authos",
      tier: "api",
    });
    expect(result.documents[0]?.raw.spec).toMatchObject({
      template: {
        metadata: {
          labels: {
            app: "authos",
            tier: "api",
          },
        },
      },
    });
  });

  it("parses duplicate resource names in different namespaces", () => {
    const result = parseK8sYaml(`apiVersion: v1
kind: ConfigMap
metadata:
  name: shared-name
  namespace: team-a
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: shared-name
  namespace: team-b`);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.documents).toHaveLength(2);
    expect(
      result.documents.map((document) => document.metadata.namespace),
    ).toEqual(["team-a", "team-b"]);
  });
});
