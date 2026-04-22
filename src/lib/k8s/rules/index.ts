import { apiVersionK8sRules } from "@/lib/k8s/rules/api-version";
import { basicK8sRules } from "@/lib/k8s/rules/basic";
import { networkingK8sRules } from "@/lib/k8s/rules/networking";
import { operationsK8sRules } from "@/lib/k8s/rules/operations";
import { reliabilityK8sRules } from "@/lib/k8s/rules/reliability";
import { schemaK8sRules } from "@/lib/k8s/rules/schema";
import { securityK8sRules } from "@/lib/k8s/rules/security";

export { apiVersionK8sRules } from "@/lib/k8s/rules/api-version";
export { networkingK8sRules } from "@/lib/k8s/rules/networking";
export { operationsK8sRules } from "@/lib/k8s/rules/operations";
export { reliabilityK8sRules } from "@/lib/k8s/rules/reliability";
export { schemaK8sRules } from "@/lib/k8s/rules/schema";
export { securityK8sRules } from "@/lib/k8s/rules/security";

export const k8sRules = [
  ...securityK8sRules,
  ...networkingK8sRules,
  ...operationsK8sRules,
  ...apiVersionK8sRules,
  ...schemaK8sRules,
  ...reliabilityK8sRules,
  ...basicK8sRules,
];
