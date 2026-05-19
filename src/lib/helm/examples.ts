export const riskyHelmValuesExample = `image:
  repository: ghcr.io/example/api
  tag: latest

replicaCount: 1

resources: {}

api:
  token: super-secret-token

securityContext:
  privileged: true
  allowPrivilegeEscalation: true
`;

export const secureHelmValuesExample = `image:
  repository: ghcr.io/example/api
  tag: "1.4.2"

replicaCount: 3

resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

securityContext:
  privileged: false
  allowPrivilegeEscalation: false
  runAsNonRoot: true
`;

export const helmValuesExamples = [
  {
    id: "risky",
    title: "Risky chart values",
    summary: "Mutable tags, empty resources, and plaintext secrets.",
    content: riskyHelmValuesExample,
  },
  {
    id: "secure",
    title: "Safer chart values",
    summary: "Pinned tags, resources, and hardened security context.",
    content: secureHelmValuesExample,
  },
] as const;
