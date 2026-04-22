import type { K8sRule } from "@/lib/k8s/types";
import {
  arrayOfStrings,
  buildContainerSecurityContextSnippet,
  buildPodSecurityContextSnippet,
  createWorkloadFinding,
  dangerousCapabilities,
  formatHumanList,
  getContainerPath,
  getContainerSecurityContext,
  getContainerSpecs,
  getPodPath,
  getPodSecurityContext,
  toRecord,
} from "@/lib/k8s/rules/security/shared";

export const missingSeccompProfileRule: K8sRule = {
  id: "missing-seccomp-profile",
  title: "Missing seccomp profile",
  description:
    "Explicit seccomp settings make the syscall baseline intentional and avoid relying on cluster-specific defaults.",
  category: "security",
  defaultSeverity: "medium",
  run(context) {
    return context.workloads.flatMap((workload) => {
      const podSeccompProfile = toRecord(getPodSecurityContext(workload)?.seccompProfile);

      if (podSeccompProfile) {
        return [];
      }

      const missingContainers = getContainerSpecs(workload).filter(
        (container) =>
          !toRecord(getContainerSecurityContext(container)?.seccompProfile),
      );

      if (missingContainers.length === 0) {
        return [];
      }

      return [
        createWorkloadFinding(context, workload, {
          ruleId: this.id,
          idSuffix: workload.name,
          title: this.title,
          message:
            missingContainers.length === 1
              ? `Container "${missingContainers[0]!.name}" in ${workload.kind} "${workload.name}" does not set a seccomp profile.`
              : `${workload.kind} "${workload.name}" does not set a pod-level seccomp profile and some containers inherit no explicit seccomp setting.`,
          severity: "medium",
          category: this.category,
          path: getPodPath(workload, "securityContext.seccompProfile"),
          whyItMatters:
            "Without an explicit seccomp profile, syscall restrictions depend on cluster defaults instead of a manifest-level decision the team can review.",
          recommendation:
            "Set seccompProfile.type: RuntimeDefault unless the app has a reviewed need for a custom profile.",
          fix: {
            summary:
              "Apply RuntimeDefault seccomp at pod level as a safer starting point.",
            yamlPath: getPodPath(workload, "securityContext"),
            snippet: buildPodSecurityContextSnippet(),
          },
        }),
      ];
    });
  },
};

export const capabilitiesNotDroppingAllRule: K8sRule = {
  id: "capabilities-not-dropping-all",
  title: "Capabilities should drop ALL by default",
  description:
    "Dropping all Linux capabilities first makes any later capability grant an explicit, reviewable exception.",
  category: "security",
  defaultSeverity: "low",
  run(context) {
    return context.workloads.flatMap((workload) =>
      getContainerSpecs(workload).flatMap((container) => {
        const capabilities = toRecord(
          getContainerSecurityContext(container)?.capabilities,
        );
        const droppedCapabilities = arrayOfStrings(capabilities?.drop).map(
          (value) => value.toUpperCase(),
        );

        if (droppedCapabilities.includes("ALL")) {
          return [];
        }

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${container.name}`,
            title: this.title,
            message: `Container "${container.name}" in ${workload.kind} "${workload.name}" does not drop all capabilities before adding exceptions.`,
            severity: "low",
            category: this.category,
            path: getContainerPath(workload, container.name, "securityContext.capabilities"),
            whyItMatters:
              "Leaving the default capability set in place makes the container harder to reason about and easier to overprivilege accidentally.",
            recommendation:
              "Start from capabilities.drop: [\"ALL\"] and then add back only the minimum reviewed capabilities if the app truly requires them.",
            fix: {
              summary:
                "Drop every capability first, then add back only reviewed exceptions.",
              yamlPath: getContainerPath(
                workload,
                container.name,
                "securityContext",
              ),
              snippet: buildContainerSecurityContextSnippet(),
            },
          }),
        ];
      }),
    );
  },
};

export const dangerousCapabilitiesAddedRule: K8sRule = {
  id: "dangerous-capabilities-added",
  title: "Dangerous Linux capabilities added",
  description:
    "Capabilities such as SYS_ADMIN or NET_ADMIN meaningfully expand what a compromised container can do on the node or network.",
  category: "security",
  defaultSeverity: "high",
  run(context) {
    return context.workloads.flatMap((workload) =>
      getContainerSpecs(workload).flatMap((container) => {
        const capabilities = toRecord(
          getContainerSecurityContext(container)?.capabilities,
        );
        const addedCapabilities = arrayOfStrings(capabilities?.add).map((value) =>
          value.toUpperCase(),
        );
        const dangerous = addedCapabilities.filter((value) =>
          dangerousCapabilities.has(value),
        );

        if (dangerous.length === 0) {
          return [];
        }

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${container.name}`,
            title: this.title,
            message: `Container "${container.name}" in ${workload.kind} "${workload.name}" adds dangerous capabilities: ${formatHumanList(dangerous)}.`,
            severity: "high",
            category: this.category,
            path: getContainerPath(workload, container.name, "securityContext.capabilities.add"),
            whyItMatters:
              "Dangerous capabilities expand the kernel operations a process can perform and can make container breakout or lateral movement much easier.",
            recommendation:
              "Remove dangerous capabilities unless they are tightly justified and documented, and pair any exception with compensating controls.",
            fix: {
              summary:
                "Remove dangerous capabilities and keep only a minimal reviewed set.",
              yamlPath: getContainerPath(
                workload,
                container.name,
                "securityContext",
              ),
              snippet: buildContainerSecurityContextSnippet(),
            },
          }),
        ];
      }),
    );
  },
};

export const readOnlyRootFilesystemRule: K8sRule = {
  id: "read-only-root-filesystem",
  title: "readOnlyRootFilesystem should be true",
  description:
    "Making the root filesystem read-only limits how much an attacker or broken process can change inside the container at runtime.",
  category: "security",
  defaultSeverity: "low",
  run(context) {
    return context.workloads.flatMap((workload) =>
      getContainerSpecs(workload).flatMap((container) => {
        if (
          getContainerSecurityContext(container)?.readOnlyRootFilesystem === true
        ) {
          return [];
        }

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${container.name}`,
            title: this.title,
            message: `Container "${container.name}" in ${workload.kind} "${workload.name}" does not set readOnlyRootFilesystem: true.`,
            severity: "low",
            category: this.category,
            path: getContainerPath(
              workload,
              container.name,
              "securityContext.readOnlyRootFilesystem",
            ),
            whyItMatters:
              "A writable root filesystem gives a compromised process more room to tamper with binaries, scripts, and runtime state inside the container.",
            recommendation:
              "Set readOnlyRootFilesystem: true if the app can run from mounted writable paths such as emptyDir, PVCs, or dedicated cache directories.",
            fix: {
              summary:
                "Use a read-only root filesystem and move writes to explicit writable volumes if needed.",
              yamlPath: getContainerPath(
                workload,
                container.name,
                "securityContext",
              ),
              snippet: buildContainerSecurityContextSnippet(),
            },
          }),
        ];
      }),
    );
  },
};
