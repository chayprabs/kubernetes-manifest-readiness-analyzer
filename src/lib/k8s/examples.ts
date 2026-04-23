export type K8sManifestExample = {
  id:
    | "missing-probes-and-resources"
    | "secure-production-deployment"
    | "service-selector-mismatch"
    | "public-loadbalancer-risk"
    | "deprecated-api-example"
    | "cronjob-risk-example";
  title: string;
  summary: string;
  manifest: string;
};

export const k8sManifestExamples: readonly K8sManifestExample[] = [
  {
    id: "missing-probes-and-resources",
    title: "Missing probes and resources",
    summary:
      "A small Deployment with no probes, no requests, and no limits. Useful for seeing reliability fixes immediately.",
    manifest: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-api
  namespace: apps
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: checkout-api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: checkout-api
    spec:
      containers:
        - name: api
          image: ghcr.io/example/checkout-api:latest
          ports:
            - name: http
              containerPort: 8080`,
  },
  {
    id: "secure-production-deployment",
    title: "Secure production deployment",
    summary:
      "A healthier baseline with probes, resources, hardened securityContext, Service, and PodDisruptionBudget.",
    manifest: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: billing-api
  namespace: production
  labels:
    app.kubernetes.io/name: billing-api
    app.kubernetes.io/instance: billing-api-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: billing-api
      app.kubernetes.io/instance: billing-api-prod
  template:
    metadata:
      labels:
        app.kubernetes.io/name: billing-api
        app.kubernetes.io/instance: billing-api-prod
    spec:
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          image: ghcr.io/example/billing-api:2.7.3
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
              cpu: "1000m"
              memory: "512Mi"
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
            seccompProfile:
              type: RuntimeDefault
---
apiVersion: v1
kind: Service
metadata:
  name: billing-api
  namespace: production
spec:
  selector:
    app.kubernetes.io/name: billing-api
    app.kubernetes.io/instance: billing-api-prod
  ports:
    - name: http
      port: 80
      targetPort: http
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: billing-api-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: billing-api
      app.kubernetes.io/instance: billing-api-prod`,
  },
  {
    id: "service-selector-mismatch",
    title: "Service selector mismatch",
    summary:
      "A Service whose selector does not match the Deployment labels, which should trigger networking guidance and selector repair suggestions.",
    manifest: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders
  namespace: apps
  labels:
    app.kubernetes.io/name: orders
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: orders
  template:
    metadata:
      labels:
        app.kubernetes.io/name: orders
    spec:
      containers:
        - name: api
          image: ghcr.io/example/orders:1.4.8
          ports:
            - name: http
              containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: orders
  namespace: apps
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: http`,
  },
  {
    id: "public-loadbalancer-risk",
    title: "Public LoadBalancer risk",
    summary:
      "A Service exposed through LoadBalancer without clear internal-only annotations and an Ingress without TLS.",
    manifest: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: edge
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: web
  template:
    metadata:
      labels:
        app.kubernetes.io/name: web
    spec:
      containers:
        - name: web
          image: ghcr.io/example/web:3.2.1
          ports:
            - name: http
              containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: edge
spec:
  type: LoadBalancer
  selector:
    app.kubernetes.io/name: web
  ports:
    - name: http
      port: 80
      targetPort: http
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  namespace: edge
spec:
  rules:
    - host: web.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80`,
  },
  {
    id: "deprecated-api-example",
    title: "Deprecated API example",
    summary:
      "An older Ingress API version that should be flagged against modern Kubernetes target versions.",
    manifest: `apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: legacy-web
  namespace: apps
spec:
  rules:
    - host: legacy.example.com
      http:
        paths:
          - path: /
            backend:
              serviceName: legacy-web
              servicePort: 80`,
  },
  {
    id: "cronjob-risk-example",
    title: "CronJob risk example",
    summary:
      "A CronJob missing concurrencyPolicy and history limits, good for quick operational-risk checks.",
    manifest: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-sync
  namespace: ops
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: sync
              image: ghcr.io/example/sync:1.9.0
              args:
                - /bin/sh
                - -c
                - sync-data.sh`,
  },
] as const;

export const defaultK8sManifestExample = k8sManifestExamples[0]!;
