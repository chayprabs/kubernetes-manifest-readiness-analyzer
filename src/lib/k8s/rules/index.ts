import { basicK8sRules } from "@/lib/k8s/rules/basic";
import { reliabilityK8sRules } from "@/lib/k8s/rules/reliability";
import { securityK8sRules } from "@/lib/k8s/rules/security";

export { reliabilityK8sRules } from "@/lib/k8s/rules/reliability";
export { securityK8sRules } from "@/lib/k8s/rules/security";

export const k8sRules = [
  ...securityK8sRules,
  ...reliabilityK8sRules,
  ...basicK8sRules,
];
