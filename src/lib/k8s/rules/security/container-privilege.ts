import type { K8sRule } from "@/lib/k8s/types";
import {
  buildContainerSecurityContextSnippet,
  buildPodSecurityContextSnippet,
  createWorkloadFinding,
  getContainerPath,
  getContainerSecurityContext,
  getContainerSpecs,
  getEffectiveBooleanField,
  getEffectiveNumericField,
  getPodPath,
  getPodSecurityContext,
  toRecord,
} from "@/lib/k8s/rules/security/shared";

export const privilegedContainerRule: K8sRule = {
  id: "privileged-container",
  title: "Privileged container",
  description:
    "Privileged containers effectively bypass many kernel isolation boundaries and should be treated as a near-host access decision.",
  category: "security",
  defaultSeverity: "high",
  run(context) {
    return context.workloads.flatMap((workload) =>
      getContainerSpecs(workload).flatMap((container) => {
        if (getContainerSecurityContext(container)?.privileged !== true) {
          return [];
        }

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${container.name}`,
            title: this.title,
            message: `Container "${container.name}" in ${workload.kind} "${workload.name}" sets securityContext.privileged: true.`,
            severity: "high",
            category: this.category,
            path: getContainerPath(workload, container.name, "securityContext.privileged"),
            whyItMatters:
              "Privileged mode expands the container blast radius substantially and can expose the node if the workload is compromised.",
            recommendation:
              "Avoid privileged mode unless the workload truly requires host-level access. Start from a hardened securityContext and add only the minimum capabilities the app needs.",
            fix: {
              summary:
                "Remove privileged mode and start from a hardened container securityContext.",
              yamlPath: getContainerPath(
                workload,
                container.name,
                "securityContext",
              ),
              snippet: buildContainerSecurityContextSnippet([
                "  privileged: false",
              ]),
            },
          }),
        ];
      }),
    );
  },
};

export const allowPrivilegeEscalationRule: K8sRule = {
  id: "allow-privilege-escalation",
  title: "allowPrivilegeEscalation should be false",
  description:
    "Disabling privilege escalation reduces the chance that a process can gain more privileges than the container was meant to have.",
  category: "security",
  defaultSeverity: "low",
  run(context) {
    return context.workloads.flatMap((workload) =>
      getContainerSpecs(workload).flatMap((container) => {
        const securityContext = getContainerSecurityContext(container);
        const allowPrivilegeEscalation = securityContext?.allowPrivilegeEscalation;
        const isExplicitTrue = allowPrivilegeEscalation === true;
        const isMissing = allowPrivilegeEscalation === undefined;

        if (!isExplicitTrue && !isMissing) {
          return [];
        }

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${container.name}`,
            title: this.title,
            message: isExplicitTrue
              ? `Container "${container.name}" in ${workload.kind} "${workload.name}" allows privilege escalation.`
              : `Container "${container.name}" in ${workload.kind} "${workload.name}" does not set allowPrivilegeEscalation: false.`,
            severity: isExplicitTrue ? "medium" : "low",
            category: this.category,
            path: getContainerPath(
              workload,
              container.name,
              "securityContext.allowPrivilegeEscalation",
            ),
            whyItMatters:
              "If privilege escalation is allowed, a compromised process has more room to move beyond the intended security boundary for the container.",
            recommendation:
              "Set allowPrivilegeEscalation: false unless the application has a reviewed need for it.",
            fix: {
              summary:
                "Disable privilege escalation as part of the container securityContext.",
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

export const runAsNonRootRule: K8sRule = {
  id: "run-as-non-root",
  title: "runAsNonRoot should be true",
  description:
    "Setting runAsNonRoot makes the non-root expectation explicit instead of relying on image defaults or cluster policy.",
  category: "security",
  defaultSeverity: "medium",
  run(context) {
    return context.workloads.flatMap((workload) => {
      const podSecurityContext = getPodSecurityContext(workload);

      if (podSecurityContext?.runAsNonRoot === true) {
        return [];
      }

      const missingContainers = getContainerSpecs(workload).filter(
        (container) => getContainerSecurityContext(container)?.runAsNonRoot !== true,
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
              ? `Container "${missingContainers[0]!.name}" in ${workload.kind} "${workload.name}" does not set runAsNonRoot: true at the pod or container level.`
              : `${workload.kind} "${workload.name}" does not enforce runAsNonRoot: true for every container.`,
          severity: "medium",
          category: this.category,
          path: getPodPath(workload, "securityContext.runAsNonRoot"),
          whyItMatters:
            "Without an explicit non-root setting, the workload can silently fall back to running as root if the image or runtime configuration allows it.",
          recommendation:
            "Set runAsNonRoot: true at pod level when possible so every container inherits the safer default.",
          fix: {
            summary: "Set a non-root default at pod level.",
            yamlPath: getPodPath(workload, "securityContext"),
            snippet: buildPodSecurityContextSnippet(),
          },
        }),
      ];
    });
  },
};

export const runAsUserRootRule: K8sRule = {
  id: "run-as-user-root",
  title: "runAsUser is set to root",
  description:
    "Explicitly setting runAsUser: 0 opts the workload into root execution and should be treated as a deliberate exception.",
  category: "security",
  defaultSeverity: "high",
  run(context) {
    return context.workloads.flatMap((workload) => {
      const podRunAsUser = getPodSecurityContext(workload)?.runAsUser;

      if (podRunAsUser === 0) {
        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: workload.name,
            title: this.title,
            message: `${workload.kind} "${workload.name}" sets pod-level runAsUser: 0.`,
            severity: "high",
            category: this.category,
            path: getPodPath(workload, "securityContext.runAsUser"),
            whyItMatters:
              "Root processes inside a container still have meaningful power on the node and are a higher-risk default if the app is compromised.",
            recommendation:
              "Run the workload as a non-zero UID that matches the image and file ownership expectations.",
            fix: {
              summary:
                "Switch away from UID 0 and keep the workload explicitly non-root.",
              yamlPath: getPodPath(workload, "securityContext"),
              snippet: [
                buildPodSecurityContextSnippet(),
                "  runAsUser: 10001 # example only; choose a non-zero UID your image supports",
              ].join("\n"),
            },
          }),
        ];
      }

      return getContainerSpecs(workload).flatMap((container) => {
        if (getEffectiveNumericField(workload, container, "runAsUser") !== 0) {
          return [];
        }

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${container.name}`,
            title: this.title,
            message: `Container "${container.name}" in ${workload.kind} "${workload.name}" sets runAsUser: 0.`,
            severity: "high",
            category: this.category,
            path: getContainerPath(workload, container.name, "securityContext.runAsUser"),
            whyItMatters:
              "Root inside a container widens the impact of an escape or local privilege issue and is harder to justify in production.",
            recommendation:
              "Set a non-zero runAsUser that matches the image's permissions and keep runAsNonRoot: true.",
            fix: {
              summary: "Use a reviewed non-root UID instead of 0.",
              yamlPath: getContainerPath(
                workload,
                container.name,
                "securityContext",
              ),
              snippet: buildContainerSecurityContextSnippet([
                "  runAsUser: 10001 # example only; choose a non-zero UID your image supports",
              ]),
            },
          }),
        ];
      });
    });
  },
};

export const containerMayRunAsRootByDefaultRule: K8sRule = {
  id: "container-may-run-as-root-by-default",
  title: "Container may run as root by default",
  description:
    "A manifest-only review cannot confirm the image USER, so containers without explicit non-root settings may still start as root.",
  category: "security",
  defaultSeverity: "low",
  run(context) {
    return context.workloads.flatMap((workload) => {
      const podSecurityContext = getPodSecurityContext(workload);

      return getContainerSpecs(workload).flatMap((container) => {
        const containerSecurityContext = getContainerSecurityContext(container);

        if (
          getEffectiveBooleanField(workload, container, "runAsNonRoot") !==
            undefined ||
          getEffectiveNumericField(workload, container, "runAsUser") !==
            undefined
        ) {
          return [];
        }

        const hasOtherSecurityControls =
          Object.keys(toRecord(podSecurityContext) ?? {}).length > 0 ||
          Object.keys(toRecord(containerSecurityContext) ?? {}).length > 0;

        if (hasOtherSecurityControls) {
          return [];
        }

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${container.name}`,
            title: this.title,
            message: `Container "${container.name}" in ${workload.kind} "${workload.name}" does not set runAsNonRoot or runAsUser, so the image could still start as root by default.`,
            severity: "low",
            category: this.category,
            path: getContainerPath(workload, container.name, "securityContext"),
            whyItMatters:
              "If the image defaults to root and the manifest does not override it, the container can launch with a broader privilege baseline than intended.",
            recommendation:
              "Set runAsNonRoot: true explicitly and, when needed, choose a reviewed non-zero UID for the container.",
            fix: {
              summary:
                "Make the container's non-root intent explicit in the manifest.",
              yamlPath: getContainerPath(
                workload,
                container.name,
                "securityContext",
              ),
              snippet: buildContainerSecurityContextSnippet(),
            },
            confidence: "medium",
          }),
        ];
      });
    });
  },
};
