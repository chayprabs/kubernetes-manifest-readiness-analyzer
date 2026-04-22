import {
  allowPrivilegeEscalationRule,
  containerMayRunAsRootByDefaultRule,
  privilegedContainerRule,
  runAsNonRootRule,
  runAsUserRootRule,
} from "@/lib/k8s/rules/security/container-privilege";
import {
  hostNamespaceSharingRule,
  hostPathVolumeUsageRule,
} from "@/lib/k8s/rules/security/host-access";
import { namespaceMissingPodSecurityEnforceRule } from "@/lib/k8s/rules/security/namespace-pod-security";
import {
  dangerousCapabilitiesAddedRule,
  missingSeccompProfileRule,
  capabilitiesNotDroppingAllRule,
  readOnlyRootFilesystemRule,
} from "@/lib/k8s/rules/security/runtime-hardening";
import {
  automountServiceAccountTokenRule,
  defaultServiceAccountUsageRule,
} from "@/lib/k8s/rules/security/service-account";
import {
  literalSecretValuesRule,
  literalSensitiveEnvVarRule,
} from "@/lib/k8s/rules/security/secret-handling";
import type { K8sRule } from "@/lib/k8s/types";

export const securityK8sRules: K8sRule[] = [
  privilegedContainerRule,
  allowPrivilegeEscalationRule,
  runAsNonRootRule,
  runAsUserRootRule,
  missingSeccompProfileRule,
  capabilitiesNotDroppingAllRule,
  dangerousCapabilitiesAddedRule,
  readOnlyRootFilesystemRule,
  hostNamespaceSharingRule,
  hostPathVolumeUsageRule,
  automountServiceAccountTokenRule,
  literalSecretValuesRule,
  literalSensitiveEnvVarRule,
  containerMayRunAsRootByDefaultRule,
  namespaceMissingPodSecurityEnforceRule,
  defaultServiceAccountUsageRule,
];
