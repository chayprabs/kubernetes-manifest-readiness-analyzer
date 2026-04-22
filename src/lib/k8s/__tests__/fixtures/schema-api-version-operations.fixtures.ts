export const deprecatedIngressManifest = `apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: legacy-ingress
spec:
  backend:
    serviceName: web
    servicePort: 80`;

export const cronJobBetaManifest = `apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: legacy-cron
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: job
              image: ghcr.io/acme/job:1.0.0`;

export const pdbBetaManifest = `apiVersion: policy/v1beta1
kind: PodDisruptionBudget
metadata:
  name: legacy-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: api`;

export const duplicateDeploymentManifest = `apiVersion: apps/v1
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
          image: ghcr.io/acme/api:1.0.0
---
apiVersion: apps/v1
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
          image: ghcr.io/acme/api:1.0.0`;

export const selectorMismatchManifest = `apiVersion: apps/v1
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
          image: ghcr.io/acme/web:1.0.0`;

export const missingRecommendedLabelsManifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: labels-demo
  labels:
    app: labels-demo
spec:
  selector:
    matchLabels:
      app: labels-demo
  template:
    metadata:
      labels:
        app: labels-demo
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0`;

export const missingNamespaceManifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: namespace-demo
spec:
  selector:
    matchLabels:
      app: namespace-demo
  template:
    metadata:
      labels:
        app: namespace-demo
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0`;

export const defaultNamespaceManifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: default-namespace-demo
  namespace: default
spec:
  selector:
    matchLabels:
      app: default-namespace-demo
  template:
    metadata:
      labels:
        app: default-namespace-demo
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0`;

export const missingOwnerMetadataManifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: owner-demo
  labels:
    app.kubernetes.io/name: owner-demo
    app.kubernetes.io/instance: owner-demo
    app.kubernetes.io/component: api
    app.kubernetes.io/part-of: platform
    app.kubernetes.io/managed-by: gitops
spec:
  selector:
    matchLabels:
      app: owner-demo
  template:
    metadata:
      labels:
        app: owner-demo
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0`;

export const customResourceInstanceManifest = `apiVersion: example.com/v1
kind: Widget
metadata:
  name: sample-widget
spec:
  replicas: 2`;
