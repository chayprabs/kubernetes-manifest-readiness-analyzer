import { extractK8sResources } from "@/lib/k8s/resources";
import { hasSelectorTerms, matchesLabelSelector } from "@/lib/k8s/selectors";
import type {
  K8sHorizontalPodAutoscalerResource,
  K8sManifestDocument,
  K8sNetworkPolicyResource,
  K8sPodDisruptionBudgetResource,
  K8sRelationship,
  K8sRelationshipGraph,
  K8sRelationshipIssue,
  K8sServiceResource,
  K8sWorkloadResource,
} from "@/lib/k8s/types";

export function buildK8sRelationshipGraph(
  documents: K8sManifestDocument[],
): K8sRelationshipGraph {
  const resources = extractK8sResources(documents);
  const workloads = resources.filter(
    (resource) => resource.category === "workload",
  );
  const services = resources.filter(
    (resource) => resource.category === "service",
  );
  const podDisruptionBudgets = resources.filter(
    (resource) => resource.category === "pod-disruption-budget",
  );
  const horizontalPodAutoscalers = resources.filter(
    (resource) => resource.category === "horizontal-pod-autoscaler",
  );
  const networkPolicies = resources.filter(
    (resource) => resource.category === "network-policy",
  );
  const relationships: K8sRelationship[] = [];
  const issues: K8sRelationshipIssue[] = [];

  for (const workload of workloads) {
    const mismatchIssue = getDeploymentSelectorMismatchIssue(workload);

    if (mismatchIssue) {
      issues.push(mismatchIssue);
    }
  }

  for (const service of services) {
    const targets = getServiceTargets(service, workloads);

    relationships.push(
      ...targets.map((target) =>
        createRelationship("service-targets", service, target),
      ),
    );

    if (
      service.selector &&
      hasSelectorTerms(service.selector) &&
      targets.length === 0
    ) {
      issues.push({
        code: "service-selector-matches-nothing",
        severity: "warning",
        message: `Service "${service.name}" does not match any workloads or pods in namespace "${service.namespace}".`,
        sourceId: service.id,
        sourceRef: service.ref,
        namespace: service.namespace,
      });
    }
  }

  for (const pdb of podDisruptionBudgets) {
    const targets = getPodDisruptionBudgetTargets(pdb, workloads);

    relationships.push(
      ...targets.map((target) =>
        createRelationship("pod-disruption-budget-targets", pdb, target),
      ),
    );

    if (pdb.selector && targets.length === 0) {
      issues.push({
        code: "pdb-selector-matches-nothing",
        severity: "warning",
        message: `PodDisruptionBudget "${pdb.name}" does not match any workloads or pods in namespace "${pdb.namespace}".`,
        sourceId: pdb.id,
        sourceRef: pdb.ref,
        namespace: pdb.namespace,
      });
    }
  }

  for (const hpa of horizontalPodAutoscalers) {
    const target = getHorizontalPodAutoscalerTarget(hpa, workloads);

    if (target) {
      relationships.push(
        createRelationship("horizontal-pod-autoscaler-targets", hpa, target),
      );
      continue;
    }

    issues.push({
      code: "hpa-target-not-found",
      severity: "warning",
      message: `HorizontalPodAutoscaler "${hpa.name}" points to a target workload that was not found in namespace "${hpa.namespace}".`,
      sourceId: hpa.id,
      sourceRef: hpa.ref,
      namespace: hpa.namespace,
    });
  }

  for (const networkPolicy of networkPolicies) {
    const targets = getNetworkPolicyTargets(networkPolicy, workloads);

    relationships.push(
      ...targets.map((target) =>
        createRelationship("network-policy-targets", networkPolicy, target),
      ),
    );
  }

  return {
    resources,
    workloads,
    services,
    podDisruptionBudgets,
    horizontalPodAutoscalers,
    networkPolicies,
    relationships,
    issues,
    namespaces: Array.from(
      new Set(
        resources.flatMap((resource) =>
          resource.namespace ? [resource.namespace] : [],
        ),
      ),
    ).sort(),
  };
}

export function getServiceTargets(
  service: K8sServiceResource,
  workloads: K8sWorkloadResource[],
) {
  if (!service.selector) {
    return [];
  }

  return workloads.filter(
    (workload) =>
      workload.namespace === service.namespace &&
      matchesLabelSelector(service.selector!, workload.podTemplate.labels),
  );
}

export function getPodDisruptionBudgetTargets(
  podDisruptionBudget: K8sPodDisruptionBudgetResource,
  workloads: K8sWorkloadResource[],
) {
  if (!podDisruptionBudget.selector) {
    return [];
  }

  return workloads.filter(
    (workload) =>
      workload.namespace === podDisruptionBudget.namespace &&
      matchesLabelSelector(
        podDisruptionBudget.selector!,
        workload.podTemplate.labels,
      ),
  );
}

export function getHorizontalPodAutoscalerTarget(
  horizontalPodAutoscaler: K8sHorizontalPodAutoscalerResource,
  workloads: K8sWorkloadResource[],
) {
  const targetRef = horizontalPodAutoscaler.scaleTargetRef;

  if (!targetRef?.kind || !targetRef.name) {
    return undefined;
  }

  return workloads.find(
    (workload) =>
      workload.namespace ===
        (targetRef.namespace ?? horizontalPodAutoscaler.namespace) &&
      workload.kind === targetRef.kind &&
      workload.name === targetRef.name &&
      (targetRef.apiVersion
        ? workload.apiVersion === targetRef.apiVersion
        : true),
  );
}

export function getNetworkPolicyTargets(
  networkPolicy: K8sNetworkPolicyResource,
  workloads: K8sWorkloadResource[],
) {
  if (!networkPolicy.podSelector) {
    return [];
  }

  return workloads.filter(
    (workload) =>
      workload.namespace === networkPolicy.namespace &&
      matchesLabelSelector(
        networkPolicy.podSelector!,
        workload.podTemplate.labels,
      ),
  );
}

function getDeploymentSelectorMismatchIssue(workload: K8sWorkloadResource) {
  if (workload.kind !== "Deployment" || !workload.selector) {
    return undefined;
  }

  if (matchesLabelSelector(workload.selector, workload.podTemplate.labels)) {
    return undefined;
  }

  return {
    code: "deployment-selector-mismatch",
    severity: "error",
    message: `Deployment "${workload.name}" has a selector that does not match its pod template labels.`,
    sourceId: workload.id,
    sourceRef: workload.ref,
    namespace: workload.namespace,
  } satisfies K8sRelationshipIssue;
}

function createRelationship(
  type: K8sRelationship["type"],
  source:
    | K8sServiceResource
    | K8sPodDisruptionBudgetResource
    | K8sHorizontalPodAutoscalerResource
    | K8sNetworkPolicyResource,
  target: K8sWorkloadResource,
): K8sRelationship {
  return {
    type,
    sourceId: source.id,
    targetId: target.id,
    sourceRef: source.ref,
    targetRef: target.ref,
    namespace: target.namespace,
  };
}
