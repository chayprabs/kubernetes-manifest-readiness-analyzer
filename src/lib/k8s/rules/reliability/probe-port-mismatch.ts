import type { K8sRule } from "@/lib/k8s/types";
import {
  buildProbeTemplateSnippet,
  createWorkloadFinding,
  formatHumanList,
  getContainerPath,
  getContainerSpecs,
  getDeclaredPortNames,
  getLongRunningWorkloads,
  getProbePortReference,
  toRecord,
} from "@/lib/k8s/rules/reliability/shared";

export const probePortMismatchRule: K8sRule = {
  id: "probe-port-mismatch",
  title: "Probe port does not match container ports",
  description:
    "A probe that points at a missing named port can keep pods unready or trigger restarts even when the application itself is healthy.",
  category: "reliability",
  defaultSeverity: "medium",
  run(context) {
    return getLongRunningWorkloads(context).flatMap((workload) =>
      getContainerSpecs(workload).flatMap((container) => {
        const declaredPortNames = getDeclaredPortNames(container.record);

        return (["readinessProbe", "livenessProbe"] as const).flatMap(
          (probeField) => {
            const probe = toRecord(container.record[probeField]);

            if (!probe) {
              return [];
            }

            const portReference = getProbePortReference(probe);

            if (
              typeof portReference !== "string" ||
              declaredPortNames.has(portReference)
            ) {
              return [];
            }

            const declaredPorts =
              declaredPortNames.size > 0
                ? formatHumanList([...declaredPortNames].sort())
                : "no named ports";

            return [
              createWorkloadFinding(context, workload, {
                ruleId: this.id,
                idSuffix: `${workload.name}:${container.name}:${probeField}`,
                title: this.title,
                message: `${probeField} on container "${container.name}" references named port "${portReference}", but the container only declares ${declaredPorts}.`,
                severity: "medium",
                category: this.category,
                path: getContainerPath(workload, container.name, probeField),
                whyItMatters:
                  "If the named probe port does not exist, Kubernetes cannot check health correctly and the rollout may stall or the pod may restart unnecessarily.",
                recommendation:
                  "Point the probe at an existing named port, or declare a matching container port name. If you switch to a numeric port, make sure it is the actual listening port.",
                fix: {
                  summary:
                    "Align the probe port name with the container's declared ports.",
                  yamlPath: getContainerPath(workload, container.name, probeField),
                  snippet: [
                    "ports:",
                    "  - name: http",
                    "    containerPort: 8080",
                    "",
                    buildProbeTemplateSnippet(probeField),
                  ].join("\n"),
                },
              }),
            ];
          },
        );
      }),
    );
  },
};
