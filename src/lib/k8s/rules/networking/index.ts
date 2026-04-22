import {
  loadBalancerExposureRule,
  duplicateServicePortsRule,
  externalNameServiceRule,
  multiPortServiceNamesMissingRule,
  nodePortExposureRule,
  servicePortNoMatchingContainerPortRule,
  serviceSelectorMatchesMultipleUnrelatedWorkloadsRule,
  serviceSelectorMatchesNothingRule,
  serviceTargetPortNamedPortMissingRule,
} from "@/lib/k8s/rules/networking/services";
import {
  ingressBackendServiceMissingRule,
  ingressBroadHostRule,
  ingressWithoutTlsRule,
} from "@/lib/k8s/rules/networking/ingress";
import {
  defaultDenyNetworkPolicyDetectedRule,
  networkPolicyAbsentForNamespaceRule,
  networkPolicySelectorMatchesNothingRule,
} from "@/lib/k8s/rules/networking/policies";
import type { K8sRule } from "@/lib/k8s/types";

export const networkingK8sRules: K8sRule[] = [
  serviceSelectorMatchesNothingRule,
  serviceSelectorMatchesMultipleUnrelatedWorkloadsRule,
  serviceTargetPortNamedPortMissingRule,
  servicePortNoMatchingContainerPortRule,
  loadBalancerExposureRule,
  nodePortExposureRule,
  ingressWithoutTlsRule,
  ingressBroadHostRule,
  ingressBackendServiceMissingRule,
  networkPolicyAbsentForNamespaceRule,
  networkPolicySelectorMatchesNothingRule,
  defaultDenyNetworkPolicyDetectedRule,
  externalNameServiceRule,
  multiPortServiceNamesMissingRule,
  duplicateServicePortsRule,
];
