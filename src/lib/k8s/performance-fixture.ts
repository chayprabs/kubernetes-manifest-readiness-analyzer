type BuildLargeK8sBundleOptions = {
  workloadCount?: number;
  namespace?: string;
};

export function buildLargeK8sBundle({
  workloadCount = 320,
  namespace = "performance-lab",
}: BuildLargeK8sBundleOptions = {}) {
  return Array.from({ length: workloadCount }, (_, index) =>
    buildDeploymentAndServicePair(index, namespace),
  ).join("\n---\n");
}

function buildDeploymentAndServicePair(index: number, namespace: string) {
  const name = `perf-app-${index + 1}`;
  const label = `perf-${index + 1}`;
  const port = 8080 + (index % 10);

  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: ${name}
    app.kubernetes.io/instance: ${label}
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: ${name}
      app.kubernetes.io/instance: ${label}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ${name}
        app.kubernetes.io/instance: ${label}
    spec:
      containers:
        - name: api
          image: ghcr.io/example/${name}:latest
          ports:
            - name: http
              containerPort: ${port}
---
apiVersion: v1
kind: Service
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  selector:
    app.kubernetes.io/name: ${name}
    app.kubernetes.io/instance: ${label}
  ports:
    - name: http
      port: 80
      targetPort: http`;
}
