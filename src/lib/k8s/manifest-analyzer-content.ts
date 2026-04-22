export const kubernetesVersions = [
  "1.26",
  "1.27",
  "1.28",
  "1.29",
  "1.30",
  "1.31",
] as const;

export const manifestProfiles = [
  "Balanced",
  "Strict production",
  "Security focused",
  "Beginner friendly",
] as const;

export type ManifestExample = {
  id: string;
  title: string;
  summary: string;
  plannedOutcome: string;
  manifest: string;
};

export const manifestExamples: ManifestExample[] = [
  {
    id: "missing-probes",
    title: "Missing probes example",
    summary:
      "A deployment without readiness or liveness probes can accept traffic before the application is actually healthy.",
    plannedOutcome:
      "The finished analyzer should flag missing readiness and liveness signals and explain the rollout risk.",
    manifest: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-missing-probes
spec:
  replicas: 2
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
          image: ghcr.io/authos/web:1.0.0
          ports:
            - containerPort: 8080`,
  },
  {
    id: "missing-resources",
    title: "Missing resources example",
    summary:
      "A workload without CPU and memory requests or limits makes scheduling and noisy-neighbor control harder in production.",
    plannedOutcome:
      "The finished analyzer should call out missing requests and limits and suggest a safer starting point.",
    manifest: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-no-resources
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
          image: ghcr.io/authos/api:2.4.1`,
  },
  {
    id: "risky-loadbalancer",
    title: "Risky LoadBalancer example",
    summary:
      "A public LoadBalancer service can be reasonable, but it deserves a deliberate review of exposure, TLS, and ingress boundaries.",
    plannedOutcome:
      "The finished analyzer should highlight externally exposed services and point operators toward the relevant ingress and security checks.",
    manifest: `apiVersion: v1
kind: Service
metadata:
  name: public-web
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080`,
  },
  {
    id: "insecure-security-context",
    title: "Insecure security context example",
    summary:
      "A container running as root with privilege escalation left open can be a hard stop for stricter production environments.",
    plannedOutcome:
      "The finished analyzer should surface risky runtime posture and recommend non-root, least-privilege defaults.",
    manifest: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: root-container
spec:
  selector:
    matchLabels:
      app: root-container
  template:
    metadata:
      labels:
        app: root-container
    spec:
      containers:
        - name: root-container
          image: ghcr.io/authos/rooty:0.9.0
          securityContext:
            runAsUser: 0
            allowPrivilegeEscalation: true`,
  },
];

export const defaultManifestExample = manifestExamples[0]!;

export const faqItems = [
  {
    question: "Does Authos send my Kubernetes manifests to a server?",
    answer:
      "The tool is being designed around local browser processing whenever possible. This page already emphasizes a local-first flow, and the analysis implementation should keep that trust boundary explicit.",
  },
  {
    question: "What kinds of Kubernetes resources will this analyzer support?",
    answer:
      "The initial focus is on the resources teams most often paste during deployment reviews: Deployments, StatefulSets, DaemonSets, Services, Ingress objects, and adjacent workload configuration.",
  },
  {
    question: "How should I choose between Balanced and Strict production?",
    answer:
      "Balanced is meant to be a practical default. Strict production will lean harder on safer operational controls, while Security focused and Beginner friendly will tune the wording and emphasis for different review contexts.",
  },
  {
    question: "Will the analyzer explain why a finding matters?",
    answer:
      "Yes. The goal is not only to list risky fields, but to explain rollout impact, operational risk, and a copyable fix direction that teams can act on quickly.",
  },
  {
    question: "Can I export a report for code review or change management?",
    answer:
      "That is planned. The page shell already reserves disabled report actions so the export flow can land without changing the workspace layout later.",
  },
] as const;

export const relatedKubernetesToolPlaceholders = [
  {
    name: "Kubernetes Deprecated API Checker",
    description:
      "Review manifests for APIs that are approaching removal so upgrades do not fail late in the cycle.",
  },
  {
    name: "Kubernetes RBAC Permission Explainer",
    description:
      "Turn role and binding YAML into a human-readable summary of what a subject can actually do.",
  },
  {
    name: "Kubernetes NetworkPolicy Visualizer",
    description:
      "Map allowed ingress and egress paths so teams can understand policy intent before rollout.",
  },
  {
    name: "Pod Security Standards Checker",
    description:
      "Explain where a workload falls short of restricted or baseline pod security expectations.",
  },
] as const;
