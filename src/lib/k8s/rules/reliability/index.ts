import { cronJobMissingConcurrencyPolicyRule } from "@/lib/k8s/rules/reliability/cronjob-missing-concurrency-policy";
import { cronJobMissingHistoryLimitsRule } from "@/lib/k8s/rules/reliability/cronjob-missing-history-limits";
import { deploymentMaxUnavailableRiskRule } from "@/lib/k8s/rules/reliability/deployment-max-unavailable-risk";
import { jobMissingBackoffLimitRule } from "@/lib/k8s/rules/reliability/job-missing-backoff-limit";
import { missingLivenessProbeRule } from "@/lib/k8s/rules/reliability/missing-liveness-probe";
import { missingPodDisruptionBudgetRule } from "@/lib/k8s/rules/reliability/missing-pod-disruption-budget";
import { missingReadinessProbeRule } from "@/lib/k8s/rules/reliability/missing-readiness-probe";
import { missingResourceLimitsRule } from "@/lib/k8s/rules/reliability/missing-resource-limits";
import { missingResourceRequestsRule } from "@/lib/k8s/rules/reliability/missing-resource-requests";
import { mutableImageTagRule } from "@/lib/k8s/rules/reliability/mutable-image-tag";
import { pdbTooRestrictiveRule } from "@/lib/k8s/rules/reliability/pdb-too-restrictive";
import { probePortMismatchRule } from "@/lib/k8s/rules/reliability/probe-port-mismatch";
import { singleReplicaDeploymentRule } from "@/lib/k8s/rules/reliability/single-replica-deployment";
import { startupProbeSuggestionRule } from "@/lib/k8s/rules/reliability/startup-probe-suggestion";
import type { K8sRule } from "@/lib/k8s/types";

export const reliabilityK8sRules: K8sRule[] = [
  missingReadinessProbeRule,
  missingLivenessProbeRule,
  startupProbeSuggestionRule,
  missingResourceRequestsRule,
  missingResourceLimitsRule,
  singleReplicaDeploymentRule,
  deploymentMaxUnavailableRiskRule,
  missingPodDisruptionBudgetRule,
  pdbTooRestrictiveRule,
  mutableImageTagRule,
  probePortMismatchRule,
  cronJobMissingConcurrencyPolicyRule,
  cronJobMissingHistoryLimitsRule,
  jobMissingBackoffLimitRule,
];
