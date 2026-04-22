const httpHealth = `          readinessProbe:
            httpGet:
              path: /readyz
              port: http
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /livez
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10`;

const resources = `          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"`;

export const deploymentMissingProbesResources = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-missing-basics
spec:
  selector:
    matchLabels:
      app: api-missing-basics
  template:
    metadata:
      labels:
        app: api-missing-basics
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:1.2.3
          ports:
            - name: http
              containerPort: 8080`;

export const deploymentWithServiceAndPdb = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: ghcr.io/acme/web:2.0.0
          ports:
            - name: http
              containerPort: 8080
${httpHealth}
${resources}
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: http
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: web`;

export const statefulSetThreeReplicasNoPdb = `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
        - name: postgres
          image: postgres:16.2
          ports:
            - name: db
              containerPort: 5432
          readinessProbe:
            tcpSocket:
              port: db
            periodSeconds: 10
          livenessProbe:
            tcpSocket:
              port: db
            initialDelaySeconds: 10
            periodSeconds: 10
${resources}`;

export const deploymentStartupProbeSuggestion = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: spring-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: spring-api
  template:
    metadata:
      labels:
        app: spring-api
    spec:
      containers:
        - name: spring-api
          image: ghcr.io/acme/spring-api:3.1.0
          ports:
            - name: http
              containerPort: 8080
          readinessProbe:
            httpGet:
              path: /readyz
              port: http
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /livez
              port: http
            initialDelaySeconds: 90
            periodSeconds: 10
${resources}
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: spring-api-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: spring-api`;

export const deploymentProbePortMismatch = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: bad-probe-port
spec:
  replicas: 2
  selector:
    matchLabels:
      app: bad-probe-port
  template:
    metadata:
      labels:
        app: bad-probe-port
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:3.0.0
          ports:
            - name: web
              containerPort: 8080
          readinessProbe:
            httpGet:
              path: /readyz
              port: http
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /livez
              port: web
            initialDelaySeconds: 10
            periodSeconds: 10
${resources}
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: bad-probe-port-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: bad-probe-port`;

export const deploymentRiskyMaxUnavailable = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: risky-rollout
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: risky-rollout
  template:
    metadata:
      labels:
        app: risky-rollout
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:4.0.0
          ports:
            - name: http
              containerPort: 8080
${httpHealth}
${resources}
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: risky-rollout-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: risky-rollout`;

export const deploymentWithLatestImage = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: latest-image
spec:
  replicas: 2
  selector:
    matchLabels:
      app: latest-image
  template:
    metadata:
      labels:
        app: latest-image
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:latest
          ports:
            - name: http
              containerPort: 8080
${httpHealth}
${resources}
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: latest-image-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: latest-image`;

export const deploymentWithNoImageTag = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: no-image-tag
spec:
  replicas: 2
  selector:
    matchLabels:
      app: no-image-tag
  template:
    metadata:
      labels:
        app: no-image-tag
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api
          ports:
            - name: http
              containerPort: 8080
${httpHealth}
${resources}
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: no-image-tag-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: no-image-tag`;

export const pdbTooRestrictiveManifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: restrictive-pdb
spec:
  replicas: 3
  selector:
    matchLabels:
      app: restrictive-pdb
  template:
    metadata:
      labels:
        app: restrictive-pdb
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:5.0.0
          ports:
            - name: http
              containerPort: 8080
${httpHealth}
${resources}
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: restrictive-pdb
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: restrictive-pdb`;

export const cronJobMissingConcurrencyPolicy = `apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
spec:
  schedule: "0 2 * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: report
              image: ghcr.io/acme/report:1.0.0
              resources:
                requests:
                  cpu: "100m"
                  memory: "128Mi"
                limits:
                  cpu: "300m"
                  memory: "256Mi"`;

export const cronJobMissingHistoryLimits = `apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup
spec:
  schedule: "*/15 * * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: cleanup
              image: ghcr.io/acme/cleanup:1.0.0
              resources:
                requests:
                  cpu: "100m"
                  memory: "128Mi"
                limits:
                  cpu: "300m"
                  memory: "256Mi"`;

export const jobMissingBackoffLimit = `apiVersion: batch/v1
kind: Job
metadata:
  name: seed-data
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: seed
          image: ghcr.io/acme/seed:1.0.0
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "300m"
              memory: "256Mi"`;
