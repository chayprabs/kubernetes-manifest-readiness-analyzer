import type {
  K8sAnalyzerOptions,
  K8sAnalyzerProfile,
  K8sAnalyzerProfileId,
  K8sResolvedAnalyzerOptions,
} from "@/lib/k8s/types";

export const k8sAnalyzerProfiles: Record<
  K8sAnalyzerProfileId,
  K8sAnalyzerProfile
> = {
  balanced: {
    id: "balanced",
    label: "Balanced",
    description:
      "Default production guidance that aims to be useful without overwhelming the review.",
    includeInfoFindingsByDefault: false,
    strictSecurityByDefault: false,
    ruleOverrides: {},
  },
  strict: {
    id: "strict",
    label: "Strict production",
    description:
      "Applies stronger production expectations and escalates several operational gaps.",
    includeInfoFindingsByDefault: false,
    strictSecurityByDefault: false,
    ruleOverrides: {
      "run-as-non-root": { severity: "high" },
      "missing-liveness-probe": { severity: "high" },
      "single-replica-deployment": { severity: "medium" },
      "missing-pod-disruption-budget": { severity: "medium" },
      "pdb-too-restrictive": { severity: "medium" },
      "job-missing-backoff-limit": { severity: "medium" },
      "missing-namespace": { severity: "medium" },
      "missing-owner-team-annotations": { severity: "low" },
      "missing-recommended-app-labels": { severity: "low" },
      "nodeport-exposure": { severity: "high" },
      "ingress-without-tls": { severity: "high" },
      "networkpolicy-absent-for-namespace": { severity: "medium" },
      "externalname-service": { severity: "medium" },
      "deployment-selector-mismatch": { severity: "critical" },
    },
  },
  security: {
    id: "security",
    label: "Security focused",
    description:
      "Emphasizes safer runtime posture and exposure-related findings for security review workflows.",
    includeInfoFindingsByDefault: false,
    strictSecurityByDefault: true,
    ruleOverrides: {
      "run-as-non-root": { severity: "high" },
      "missing-namespace": { severity: "medium" },
      "missing-owner-team-annotations": { severity: "low" },
      "loadbalancer-exposure": { severity: "high" },
      "nodeport-exposure": { severity: "high" },
      "ingress-without-tls": { severity: "high" },
      "networkpolicy-absent-for-namespace": { severity: "medium" },
      "externalname-service": { severity: "medium" },
      "hpa-target-not-found": { severity: "low" },
    },
  },
  beginner: {
    id: "beginner",
    label: "Beginner friendly",
    description:
      "Keeps important production guidance but suppresses some noisier or more advanced findings.",
    includeInfoFindingsByDefault: true,
    strictSecurityByDefault: false,
    ruleOverrides: {
      "mutable-image-tag": { enabled: false },
      "run-as-non-root": { severity: "low" },
      "unknown-or-uncommon-kind": { enabled: false },
      "missing-owner-team-annotations": { enabled: false },
    },
  },
};

export function getK8sAnalyzerProfile(
  profileId: K8sAnalyzerProfileId = "balanced",
) {
  return k8sAnalyzerProfiles[profileId];
}

export function resolveAnalyzerOptions(options: K8sAnalyzerOptions = {}) {
  const profile = getK8sAnalyzerProfile(options.profile ?? "balanced");

  const resolvedOptions: K8sResolvedAnalyzerOptions = {
    kubernetesTargetVersion: options.kubernetesTargetVersion,
    profile: profile.id,
    namespaceFilter: options.namespaceFilter,
    includeInfoFindings:
      options.includeInfoFindings ?? profile.includeInfoFindingsByDefault,
    strictSecurity: options.strictSecurity ?? profile.strictSecurityByDefault,
  };

  return {
    profile,
    options: resolvedOptions,
  };
}
