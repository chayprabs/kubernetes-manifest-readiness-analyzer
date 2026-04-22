import type { K8sRule } from "@/lib/k8s/types";
import {
  createWorkloadFinding,
  formatHumanList,
  getPodPath,
  toNonEmptyString,
  toRecord,
} from "@/lib/k8s/rules/security/shared";

export const hostNamespaceSharingRule: K8sRule = {
  id: "host-namespace-sharing",
  title: "Host namespace sharing enabled",
  description:
    "Sharing the host network, PID namespace, or IPC namespace expands the blast radius from the pod into the node.",
  category: "security",
  defaultSeverity: "high",
  run(context) {
    return context.workloads.flatMap((workload) => {
      const enabled = [
        workload.podTemplate.spec.hostNetwork === true ? "hostNetwork" : undefined,
        workload.podTemplate.spec.hostPID === true ? "hostPID" : undefined,
        workload.podTemplate.spec.hostIPC === true ? "hostIPC" : undefined,
      ].filter((value): value is string => value !== undefined);

      if (enabled.length === 0) {
        return [];
      }

      return [
        createWorkloadFinding(context, workload, {
          ruleId: this.id,
          idSuffix: workload.name,
          title: this.title,
          message: `${workload.kind} "${workload.name}" enables ${formatHumanList(enabled)}.`,
          severity: "high",
          category: this.category,
          path: getPodPath(workload),
          whyItMatters:
            "Host namespace sharing makes it easier for a compromised container to inspect, influence, or interfere with other workloads and node-level resources.",
          recommendation:
            "Disable host namespace sharing unless the workload has a reviewed operational reason that truly requires it.",
          fix: {
            summary: "Turn off host namespace sharing flags.",
            yamlPath: getPodPath(workload),
            snippet: [
              "hostNetwork: false",
              "hostPID: false",
              "hostIPC: false",
            ].join("\n"),
          },
        }),
      ];
    });
  },
};

export const hostPathVolumeUsageRule: K8sRule = {
  id: "hostpath-volume-usage",
  title: "hostPath volume needs careful review",
  description:
    "hostPath mounts expose parts of the node filesystem to the pod and should be treated as a high-trust exception.",
  category: "security",
  defaultSeverity: "medium",
  run(context) {
    return context.workloads.flatMap((workload) => {
      const volumes = Array.isArray(workload.podTemplate.spec.volumes)
        ? workload.podTemplate.spec.volumes
        : [];

      return volumes.flatMap((entry) => {
        const volume = toRecord(entry);
        const hostPath = toRecord(volume?.hostPath);
        const volumeName = toNonEmptyString(volume?.name) ?? "volume";
        const path = toNonEmptyString(hostPath?.path);

        if (!hostPath || !path) {
          return [];
        }

        const severity = isSensitiveHostPath(path) ? "high" : "medium";

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${volumeName}`,
            title: this.title,
            message: `${workload.kind} "${workload.name}" mounts hostPath "${path}" through volume "${volumeName}".`,
            severity,
            category: this.category,
            path: getPodPath(workload, `volumes[name=${volumeName}].hostPath`),
            whyItMatters:
              "hostPath gives the pod direct access to node files or sockets, which can expose credentials, runtime state, or the container runtime itself if used carelessly.",
            recommendation:
              "Review whether hostPath is truly required. Prefer PVCs, emptyDir, ConfigMaps, or Secrets where possible, and document any remaining hostPath use as a reviewed exception.",
            fix: {
              summary:
                "Replace hostPath with a safer volume type when the workload does not need node filesystem access.",
              yamlPath: getPodPath(workload, `volumes[name=${volumeName}]`),
              snippet: [
                "# Prefer a safer volume type when possible:",
                "volumes:",
                `  - name: ${volumeName}`,
                "    emptyDir: {}",
                "# or use a PersistentVolumeClaim / ConfigMap / Secret as appropriate",
              ].join("\n"),
            },
          }),
        ];
      });
    });
  },
};

function isSensitiveHostPath(path: string) {
  const normalized = path.toLowerCase();

  return (
    normalized === "/" ||
    normalized.startsWith("/etc") ||
    normalized.startsWith("/root") ||
    normalized.startsWith("/proc") ||
    normalized.startsWith("/sys") ||
    normalized.startsWith("/var/lib/kubelet") ||
    normalized.startsWith("/var/run") ||
    normalized.startsWith("/run/containerd") ||
    normalized.includes("docker.sock")
  );
}
