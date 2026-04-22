import {
  deprecatedApiVersionRule,
  podSecurityPolicyRemovedRule,
} from "@/lib/k8s/rules/api-version/deprecated-apis";
import type { K8sRule } from "@/lib/k8s/types";

export const apiVersionK8sRules: K8sRule[] = [
  deprecatedApiVersionRule,
  podSecurityPolicyRemovedRule,
];
