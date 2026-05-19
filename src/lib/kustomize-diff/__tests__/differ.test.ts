import { describe, expect, it } from "vitest";
import { compareKustomizeOutputs } from "@/lib/kustomize-diff/differ";

const baseDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: apps
spec:
  replicas: 2
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
          image: ghcr.io/example/api:1.0.0
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
`;

describe("compareKustomizeOutputs", () => {
  it("detects image tag changes", () => {
    const right = baseDeployment.replace("1.0.0", "1.1.0");
    const report = compareKustomizeOutputs(baseDeployment, right);

    expect(report.ok).toBe(true);
    expect(report.changed).toHaveLength(1);
    expect(report.changed[0]?.category).toBe("image");
  });

  it("detects added resources", () => {
    const right = `${baseDeployment}
---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: apps
spec:
  selector:
    app: api
  ports:
    - port: 80
`;
    const report = compareKustomizeOutputs(baseDeployment, right);

    expect(report.added).toHaveLength(1);
    expect(report.added[0]?.kind).toBe("Service");
  });
});
