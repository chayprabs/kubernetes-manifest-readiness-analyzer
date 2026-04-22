import {
  hardcodedDefaultNamespaceRule,
  largeConfigOrSecretRule,
  missingNamespaceRule,
  missingOwnerTeamAnnotationsRule,
} from "@/lib/k8s/rules/operations/metadata";
import type { K8sRule } from "@/lib/k8s/types";

export const operationsK8sRules: K8sRule[] = [
  missingNamespaceRule,
  hardcodedDefaultNamespaceRule,
  missingOwnerTeamAnnotationsRule,
  largeConfigOrSecretRule,
];
