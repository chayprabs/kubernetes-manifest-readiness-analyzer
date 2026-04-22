export const privilegedDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: privileged-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: privileged-app
  template:
    metadata:
      labels:
        app: privileged-app
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0
          securityContext:
            privileged: true`;

export const secureDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: hardened-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hardened-api
  template:
    metadata:
      labels:
        app: hardened-api
    spec:
      serviceAccountName: hardened-api
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: DB_PASSWORD`;

export const runAsUserRootDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: root-user
spec:
  replicas: 1
  selector:
    matchLabels:
      app: root-user
  template:
    metadata:
      labels:
        app: root-user
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0
          securityContext:
            runAsUser: 0`;

export const dangerousCapabilitiesDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: dangerous-caps
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dangerous-caps
  template:
    metadata:
      labels:
        app: dangerous-caps
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0
          securityContext:
            capabilities:
              add:
                - SYS_ADMIN`;

export const hostPathDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: hostpath-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hostpath-app
  template:
    metadata:
      labels:
        app: hostpath-app
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0
          volumeMounts:
            - name: docker-sock
              mountPath: /var/run/docker.sock
      volumes:
        - name: docker-sock
          hostPath:
            path: /var/run/docker.sock`;

export const hostNamespaceDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: host-network-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: host-network-app
  template:
    metadata:
      labels:
        app: host-network-app
    spec:
      hostNetwork: true
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0`;

export const allowPrivilegeEscalationTrueDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ape-true
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ape-true
  template:
    metadata:
      labels:
        app: ape-true
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0
          securityContext:
            allowPrivilegeEscalation: true
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL`;

export const allowPrivilegeEscalationMissingDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ape-missing
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ape-missing
  template:
    metadata:
      labels:
        app: ape-missing
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0
          securityContext:
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL`;

export const missingSeccompDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: no-seccomp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: no-seccomp
  template:
    metadata:
      labels:
        app: no-seccomp
    spec:
      securityContext:
        runAsNonRoot: true
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL`;

export const readOnlyRootFilesystemMissingDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: writable-root
spec:
  replicas: 1
  selector:
    matchLabels:
      app: writable-root
  template:
    metadata:
      labels:
        app: writable-root
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL`;

export const automountDefaultServiceAccountDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: default-sa
spec:
  replicas: 2
  selector:
    matchLabels:
      app: default-sa
  template:
    metadata:
      labels:
        app: default-sa
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL`;

export const intentionalApiAccessManifest = `apiVersion: v1
kind: ServiceAccount
metadata:
  name: controller-sa
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: controller-bind
subjects:
  - kind: ServiceAccount
    name: controller-sa
    namespace: default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: read-config
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: controller
spec:
  replicas: 1
  selector:
    matchLabels:
      app: controller
  template:
    metadata:
      labels:
        app: controller
    spec:
      serviceAccountName: controller-sa
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: controller
          image: ghcr.io/acme/controller:1.0.0
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL`;

export const literalSensitiveEnvDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: inline-secret-env
spec:
  replicas: 1
  selector:
    matchLabels:
      app: inline-secret-env
  template:
    metadata:
      labels:
        app: inline-secret-env
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0
          env:
            - name: DB_PASSWORD
              value: super-secret-password-123`;

export const literalSecretManifest = `apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
stringData:
  password: dont-print-me
  api_key: also-do-not-print`;

export const namespaceWithoutPodSecurity = `apiVersion: v1
kind: Namespace
metadata:
  name: team-a`;

export const rootByDefaultDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: root-by-default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: root-by-default
  template:
    metadata:
      labels:
        app: root-by-default
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/api:1.0.0`;
