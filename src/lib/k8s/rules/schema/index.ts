import {
  deploymentSelectorMismatchRule,
  duplicateObjectIdentityRule,
  missingRecommendedAppLabelsRule,
  unknownOrUncommonKindRule,
} from "@/lib/k8s/rules/schema/common";
import type { K8sRule } from "@/lib/k8s/types";

export const schemaK8sRules: K8sRule[] = [
  unknownOrUncommonKindRule,
  duplicateObjectIdentityRule,
  deploymentSelectorMismatchRule,
  missingRecommendedAppLabelsRule,
];
