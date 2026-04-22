import type { K8sRule } from "@/lib/k8s/types";
import {
  buildSelectorMismatchSnippet,
  createResourceFinding,
  formatHumanList,
  formatWorkloadSummary,
  getExternalName,
  getMatchedWorkloadsForService,
  getServiceIdentity,
  getServicePorts,
  getServiceType,
  getWorkloadPortNames,
  getWorkloadPortNumbers,
  hasInternalLoadBalancerIndicator,
  hasSelectorMatchExpressions,
  isSecurityProfile,
  selectorToString,
  workloadHasDeclaredPorts,
} from "@/lib/k8s/rules/networking/shared";

export const serviceSelectorMatchesNothingRule: K8sRule = {
  id: "service-selector-matches-nothing",
  title: "Service selector matches no workloads",
  description:
    "A Service without matching workloads will accept traffic that never reaches a pod.",
  category: "networking",
  defaultSeverity: "high",
  run(context) {
    return context.services.flatMap((service) => {
      const targets = getMatchedWorkloadsForService(context, service);

      if (
        !service.selector ||
        targets.length > 0
      ) {
        return [];
      }

      const namespaceWorkloads = context.workloads.filter(
        (workload) => workload.namespace === service.namespace,
      );

      return [
        createResourceFinding(context, service, {
          ruleId: this.id,
          idSuffix: service.name,
          title: this.title,
          message: `Service "${service.name}" in namespace "${service.namespace}" uses selector "${selectorToString(service.selector)}", but it does not match any workloads in that namespace.`,
          severity: "high",
          category: this.category,
          path: "spec.selector",
          whyItMatters:
            "Traffic sent to the Service will not reach any backend pods, which usually means requests fail or hang until the selector is corrected.",
          recommendation:
            namespaceWorkloads.length > 0
              ? `Align the selector with the intended workload labels. Candidate workloads in namespace "${service.namespace}": ${namespaceWorkloads
                  .slice(0, 3)
                  .map(formatWorkloadSummary)
                  .join("; ")}.`
              : `No workloads were found in namespace "${service.namespace}". Confirm the Service namespace and selector before relying on it.`,
          fix: {
            summary:
              "Update the Service selector so it matches the intended workload labels.",
            yamlPath: "spec.selector",
            snippet: buildSelectorMismatchSnippet(service.selector, namespaceWorkloads),
          },
          confidence: hasSelectorMatchExpressions(service.selector)
            ? "medium"
            : "high",
        }),
      ];
    });
  },
};

export const serviceSelectorMatchesMultipleUnrelatedWorkloadsRule: K8sRule = {
  id: "service-selector-matches-multiple-unrelated-workloads",
  title: "Service selector is broader than one app",
  description:
    "A broad Service selector can route traffic across workloads that do not appear to be the same application.",
  category: "networking",
  defaultSeverity: "medium",
  run(context) {
    return context.services.flatMap((service) => {
      const targets = getMatchedWorkloadsForService(context, service);

      if (targets.length < 2) {
        return [];
      }

      const identities = new Set(targets.map(getServiceIdentity));

      if (identities.size < 2) {
        return [];
      }

      return [
        createResourceFinding(context, service, {
          ruleId: this.id,
          idSuffix: service.name,
          title: this.title,
          message: `Service "${service.name}" selector "${selectorToString(service.selector)}" matches multiple workloads that look unrelated: ${targets
            .slice(0, 4)
            .map((target) => `${target.kind}/${target.name}`)
            .join(", ")}.`,
          severity: "medium",
          category: this.category,
          path: "spec.selector",
          whyItMatters:
            "If a selector spans unrelated workloads, requests can land on the wrong pods and create hard-to-diagnose routing or rollout issues.",
          recommendation:
            "Tighten the selector with a stable app identity label so only the intended workload backs this Service.",
          fix: {
            summary:
              "Narrow the selector to a single reviewed app identity label.",
            yamlPath: "spec.selector",
            snippet: buildSelectorMismatchSnippet(service.selector, targets),
          },
          confidence: hasSelectorMatchExpressions(service.selector)
            ? "medium"
            : "high",
        }),
      ];
    });
  },
};

export const serviceTargetPortNamedPortMissingRule: K8sRule = {
  id: "service-targetport-named-port-missing",
  title: "Service targetPort name is missing on workloads",
  description:
    "If a Service points to a named port that workloads do not declare, traffic cannot be routed consistently to the intended container port.",
  category: "networking",
  defaultSeverity: "medium",
  run(context) {
    return context.services.flatMap((service) => {
      const targets = getMatchedWorkloadsForService(context, service);

      if (targets.length === 0) {
        return [];
      }

      return getServicePorts(context, service).flatMap((servicePort) => {
        if (typeof servicePort.targetPort !== "string") {
          return [];
        }

        const targetPort = servicePort.targetPort;
        const missingOn = targets.filter(
          (workload) => !getWorkloadPortNames(workload).has(targetPort),
        );

        if (missingOn.length === 0) {
          return [];
        }

        const severity = missingOn.length === targets.length ? "medium" : "low";

        return [
          createResourceFinding(context, service, {
            ruleId: this.id,
            idSuffix: `${service.name}:${servicePort.name ?? servicePort.port ?? servicePort.index}`,
            title: this.title,
            message: `Service "${service.name}" uses targetPort "${targetPort}" on port ${servicePort.port ?? "unknown"}, but ${formatHumanList(
              missingOn.map((workload) => `${workload.kind}/${workload.name}`),
            )} does not declare that named container port.`,
            severity,
            category: this.category,
            path: `spec.ports[${servicePort.index}].targetPort`,
            whyItMatters:
              "A named targetPort is only reliable when the matching workloads declare the same named containerPort consistently.",
            recommendation:
              "Update the Service targetPort or the workload container port names so they match exactly across every selected workload.",
            confidence: hasSelectorMatchExpressions(service.selector)
              ? "medium"
              : "high",
          }),
        ];
      });
    });
  },
};

export const servicePortNoMatchingContainerPortRule: K8sRule = {
  id: "service-port-missing-container-port",
  title: "Service port has no matching declared container port",
  description:
    "A Service can still work without declared containerPort fields, but a numeric mismatch is often a sign that traffic is pointed at the wrong port.",
  category: "networking",
  defaultSeverity: "low",
  run(context) {
    return context.services.flatMap((service) => {
      const targets = getMatchedWorkloadsForService(context, service);

      if (targets.length === 0) {
        return [];
      }

      return getServicePorts(context, service).flatMap((servicePort) => {
        const numericTarget =
          typeof servicePort.targetPort === "number"
            ? servicePort.targetPort
            : servicePort.targetPort === undefined
              ? servicePort.port
              : undefined;

        if (numericTarget === undefined) {
          return [];
        }

        const workloadsWithDeclaredPorts = targets.filter(workloadHasDeclaredPorts);
        const missingOn = targets.filter(
          (workload) => !getWorkloadPortNumbers(workload).has(numericTarget),
        );

        if (missingOn.length === 0) {
          return [];
        }

        const allDeclaredAndMissing =
          workloadsWithDeclaredPorts.length === targets.length &&
          missingOn.length === targets.length;
        const noDeclaredPorts = workloadsWithDeclaredPorts.length === 0;

        return [
          createResourceFinding(context, service, {
            ruleId: this.id,
            idSuffix: `${service.name}:${servicePort.name ?? servicePort.port ?? servicePort.index}`,
            title: this.title,
            message: `Service "${service.name}" forwards port ${servicePort.port ?? "unknown"} to ${numericTarget}, but ${formatHumanList(
              missingOn.map((workload) => `${workload.kind}/${workload.name}`),
            )} does not declare containerPort ${numericTarget}.`,
            severity: allDeclaredAndMissing ? "medium" : "low",
            category: this.category,
            path: `spec.ports[${servicePort.index}]`,
            whyItMatters:
              "A mismatched numeric port often means the Service points at the wrong listener, though declared container ports are only a basic manifest hint and not proof of runtime behavior.",
            recommendation:
              "Confirm the application really listens on the target port. If it does, declare that containerPort for clarity; otherwise update the Service targetPort to the real listener.",
            confidence: noDeclaredPorts
              ? "low"
              : hasSelectorMatchExpressions(service.selector)
                ? "medium"
                : "medium",
          }),
        ];
      });
    });
  },
};

export const loadBalancerExposureRule: K8sRule = {
  id: "loadbalancer-exposure",
  title: "LoadBalancer Service exposure",
  description:
    "LoadBalancer Services often create externally reachable entry points, so they deserve an explicit exposure review.",
  category: "networking",
  defaultSeverity: "medium",
  run(context) {
    return context.services.flatMap((service) => {
      if (
        getServiceType(context, service) !== "LoadBalancer" ||
        hasInternalLoadBalancerIndicator(service)
      ) {
        return [];
      }

      return [
        createResourceFinding(context, service, {
          ruleId: this.id,
          idSuffix: service.name,
          title: this.title,
          message: `Service "${service.name}" is type LoadBalancer and does not show an obvious internal-only annotation.`,
          severity: isSecurityProfile(context) ? "high" : "medium",
          category: this.category,
          path: "spec.type",
          whyItMatters:
            "A LoadBalancer commonly exposes the service beyond the cluster, which makes TLS, authn/authz, source restrictions, and intended audience worth reviewing before rollout.",
          recommendation:
            "Confirm whether this Service should be public. If it should stay private, use the appropriate internal load balancer annotation for your platform or route traffic through a reviewed private ingress path.",
          fix: {
            summary:
              "Confirm public exposure intentionally or switch to an internal/private entry point.",
            yamlPath: "spec.type",
            snippet: [
              "# Review whether public exposure is intended.",
              "type: ClusterIP",
              "# or keep LoadBalancer and add your platform's internal annotation if this should stay private",
            ].join("\n"),
          },
        }),
      ];
    });
  },
};

export const nodePortExposureRule: K8sRule = {
  id: "nodeport-exposure",
  title: "NodePort Service exposure",
  description:
    "NodePort opens a port on every node, which broadens the exposure surface compared with ClusterIP or a reviewed ingress layer.",
  category: "networking",
  defaultSeverity: "medium",
  run(context) {
    return context.services.flatMap((service) => {
      if (getServiceType(context, service) !== "NodePort") {
        return [];
      }

      return [
        createResourceFinding(context, service, {
          ruleId: this.id,
          idSuffix: service.name,
          title: this.title,
          message: `Service "${service.name}" is type NodePort, which exposes the service on cluster nodes.`,
          severity: isSecurityProfile(context) ? "high" : "medium",
          category: this.category,
          path: "spec.type",
          whyItMatters:
            "NodePort can make the service reachable through every node address unless other network controls intervene, which is easy to overlook in reviews.",
          recommendation:
            "Confirm that node-level exposure is intentional. Prefer ClusterIP plus Ingress or a private load balancer when you do not need direct node ports.",
          fix: {
            summary:
              "Switch away from NodePort unless direct node exposure is a reviewed requirement.",
            yamlPath: "spec.type",
            snippet: "type: ClusterIP",
          },
        }),
      ];
    });
  },
};

export const externalNameServiceRule: K8sRule = {
  id: "externalname-service",
  title: "ExternalName Service relies on external DNS",
  description:
    "ExternalName Services are a DNS indirection to an external dependency, not an in-cluster backend.",
  category: "networking",
  defaultSeverity: "low",
  run(context) {
    return context.services.flatMap((service) => {
      if (getServiceType(context, service) !== "ExternalName") {
        return [];
      }

      return [
        createResourceFinding(context, service, {
          ruleId: this.id,
          idSuffix: service.name,
          title: this.title,
          message: `Service "${service.name}" is type ExternalName and points at "${getExternalName(context, service) ?? "an external DNS name"}".`,
          severity: "low",
          category: this.category,
          path: "spec.type",
          whyItMatters:
            "ExternalName shifts availability and trust to an external DNS target, so failures or changes there can impact traffic without a normal in-cluster Service backend.",
          recommendation:
            "Review the external dependency, DNS ownership, and failure modes. Use a regular Service when the backend is actually inside the cluster.",
        }),
      ];
    });
  },
};

export const multiPortServiceNamesMissingRule: K8sRule = {
  id: "service-multiport-names-missing",
  title: "Multi-port Service should name every port",
  description:
    "Naming ports on multi-port Services makes target references and troubleshooting much clearer.",
  category: "networking",
  defaultSeverity: "low",
  run(context) {
    return context.services.flatMap((service) => {
      const ports = getServicePorts(context, service);

      if (ports.length < 2) {
        return [];
      }

      const missing = ports.filter((port) => !port.name);

      if (missing.length === 0) {
        return [];
      }

      return [
        createResourceFinding(context, service, {
          ruleId: this.id,
          idSuffix: service.name,
          title: this.title,
          message: `Service "${service.name}" exposes multiple ports, but ${missing.length} of them is missing a name.`,
          severity: "low",
          category: this.category,
          path: "spec.ports",
          whyItMatters:
            "Named ports make references from Ingress, probes, and targetPort mappings easier to review and less error-prone.",
          recommendation:
            "Give every Service port a stable name when the Service exposes more than one port.",
        }),
      ];
    });
  },
};

export const duplicateServicePortsRule: K8sRule = {
  id: "service-duplicate-ports",
  title: "Service has duplicate port definitions",
  description:
    "Duplicate Service port names or repeated port/protocol entries make the manifest ambiguous and harder to reason about.",
  category: "schema",
  defaultSeverity: "medium",
  run(context) {
    return context.services.flatMap((service) => {
      const ports = getServicePorts(context, service);
      const duplicateNames = findDuplicates(
        ports.flatMap((port) => (port.name ? [port.name] : [])),
      );
      const duplicateNumbers = findDuplicates(
        ports.flatMap((port) =>
          port.port !== undefined ? [`${port.port}/${port.protocol}`] : [],
        ),
      );

      if (duplicateNames.length === 0 && duplicateNumbers.length === 0) {
        return [];
      }

      return [
        createResourceFinding(context, service, {
          ruleId: this.id,
          idSuffix: service.name,
          title: this.title,
          message: `Service "${service.name}" repeats ${[
            duplicateNames.length > 0
              ? `port name${duplicateNames.length > 1 ? "s" : ""} ${duplicateNames.join(", ")}`
              : undefined,
            duplicateNumbers.length > 0
              ? `port/protocol ${duplicateNumbers.join(", ")}`
              : undefined,
          ]
            .filter((value): value is string => value !== undefined)
            .join(" and ")}.`,
          severity: "medium",
          category: this.category,
          path: "spec.ports",
          whyItMatters:
            "Duplicate Service port definitions are easy to misread and can hide accidental copy/paste errors in a manifest review.",
          recommendation:
            "Ensure each Service port name is unique and each port/protocol combination is declared only once.",
        }),
      ];
    });
  },
};

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
      continue;
    }

    seen.add(value);
  }

  return [...duplicates].sort();
}
