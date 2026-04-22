export type SupportedKubernetesTargetVersion =
  (typeof supportedKubernetesTargetVersions)[number];

export const supportedKubernetesTargetVersions = [
  "1.24",
  "1.25",
  "1.26",
  "1.27",
  "1.28",
  "1.29",
  "1.30",
  "1.31",
  "1.32",
] as const;

export const latestSupportedKubernetesTargetVersion =
  supportedKubernetesTargetVersions.at(-1)!;

export type K8sApiDeprecationRecord = {
  kind: string;
  apiVersion: string;
  replacementApiVersion?: string;
  replacementAvailableSince?: string;
  removedIn: string;
  docsUrl?: string;
  notes?: string;
};

const deprecationGuideUrl =
  "https://kubernetes.io/docs/reference/using-api/deprecation-guide/";

// TODO(authos): verify each replacement availability version against the official
// migration guide before broad launch if we expand this table significantly.
export const kubernetesApiDeprecations: readonly K8sApiDeprecationRecord[] = [
  {
    kind: "CronJob",
    apiVersion: "batch/v1beta1",
    replacementApiVersion: "batch/v1",
    replacementAvailableSince: "1.21",
    removedIn: "1.25",
    docsUrl: deprecationGuideUrl,
  },
  {
    kind: "PodDisruptionBudget",
    apiVersion: "policy/v1beta1",
    replacementApiVersion: "policy/v1",
    replacementAvailableSince: "1.21",
    removedIn: "1.25",
    docsUrl: deprecationGuideUrl,
    notes:
      "policy/v1 changes empty selector behavior: {} selects all pods in the namespace.",
  },
  {
    kind: "Ingress",
    apiVersion: "extensions/v1beta1",
    replacementApiVersion: "networking.k8s.io/v1",
    replacementAvailableSince: "1.19",
    removedIn: "1.22",
    docsUrl: deprecationGuideUrl,
    notes:
      "Ingress v1 renames backend fields and requires pathType on each path.",
  },
  {
    kind: "Ingress",
    apiVersion: "networking.k8s.io/v1beta1",
    replacementApiVersion: "networking.k8s.io/v1",
    replacementAvailableSince: "1.19",
    removedIn: "1.22",
    docsUrl: deprecationGuideUrl,
    notes:
      "Ingress v1 renames backend fields and requires pathType on each path.",
  },
  {
    kind: "PodSecurityPolicy",
    apiVersion: "policy/v1beta1",
    removedIn: "1.25",
    docsUrl: deprecationGuideUrl,
    notes:
      "PodSecurityPolicy was removed; migrate to Pod Security Admission or a reviewed third-party admission webhook.",
  },
  {
    kind: "PodSecurityPolicy",
    apiVersion: "extensions/v1beta1",
    replacementApiVersion: "policy/v1beta1",
    replacementAvailableSince: "1.10",
    removedIn: "1.16",
    docsUrl: deprecationGuideUrl,
    notes:
      "The policy/v1beta1 API also stops being served in 1.25, so plan a full PSP migration.",
  },
  {
    kind: "HorizontalPodAutoscaler",
    apiVersion: "autoscaling/v2beta1",
    replacementApiVersion: "autoscaling/v2",
    replacementAvailableSince: "1.23",
    removedIn: "1.25",
    docsUrl: deprecationGuideUrl,
    notes:
      "targetAverageUtilization moves under target.averageUtilization with target.type: Utilization.",
  },
  {
    kind: "HorizontalPodAutoscaler",
    apiVersion: "autoscaling/v2beta2",
    replacementApiVersion: "autoscaling/v2",
    replacementAvailableSince: "1.23",
    removedIn: "1.26",
    docsUrl: deprecationGuideUrl,
    notes:
      "targetAverageUtilization moves under target.averageUtilization with target.type: Utilization.",
  },
] as const;

export function normalizeKubernetesVersion(version: string | undefined) {
  if (!version) {
    return undefined;
  }

  const match = version.match(/^(\d+)\.(\d+)$/);

  if (!match) {
    return undefined;
  }

  return `${Number.parseInt(match[1]!, 10)}.${Number.parseInt(match[2]!, 10)}`;
}

export function compareKubernetesVersions(
  left: string | undefined,
  right: string | undefined,
) {
  const normalizedLeft = normalizeKubernetesVersion(left);
  const normalizedRight = normalizeKubernetesVersion(right);

  if (!normalizedLeft || !normalizedRight) {
    return 0;
  }

  const [leftMajor, leftMinor] = normalizedLeft.split(".").map(Number);
  const [rightMajor, rightMinor] = normalizedRight.split(".").map(Number);

  if (
    leftMajor === undefined ||
    leftMinor === undefined ||
    rightMajor === undefined ||
    rightMinor === undefined
  ) {
    return 0;
  }

  if (leftMajor !== rightMajor) {
    return leftMajor - rightMajor;
  }

  return leftMinor - rightMinor;
}

export function versionGte(
  left: string | undefined,
  right: string | undefined,
) {
  return compareKubernetesVersions(left, right) >= 0;
}
