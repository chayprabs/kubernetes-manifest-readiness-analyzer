import type { K8sRule } from "@/lib/k8s/types";
import {
  createWorkloadFinding,
  getContainerPath,
  getContainerSpecs,
} from "@/lib/k8s/rules/reliability/shared";

export const mutableImageTagRule: K8sRule = {
  id: "mutable-image-tag",
  title: "Mutable image tag",
  description:
    "Mutable image references make rollouts harder to reproduce and complicate incident response.",
  category: "reliability",
  defaultSeverity: "medium",
  run(context) {
    return context.workloads.flatMap((workload) =>
      getContainerSpecs(workload).flatMap((container) => {
        const image = container.image;

        if (!image) {
          return [];
        }

        const reason = getMutableImageReason(image);

        if (!reason) {
          return [];
        }

        return [
          createWorkloadFinding(context, workload, {
            ruleId: this.id,
            idSuffix: `${workload.name}:${container.name}`,
            title: this.title,
            message: `Container "${container.name}" in ${workload.kind} "${workload.name}" uses image "${image}" ${reason}.`,
            severity: "medium",
            category: this.category,
            path: getContainerPath(workload, container.name, "image"),
            whyItMatters:
              "If the same manifest can pull different image contents later, rollouts and rollbacks become less deterministic.",
            recommendation:
              "Pin the image to an explicit version tag or, better, an image digest so deployments stay reproducible.",
            fix: {
              summary: "Pin the image reference to a versioned tag or digest.",
              yamlPath: getContainerPath(workload, container.name, "image"),
              snippet: [
                '# Example only: replace with the real version or digest you intend to ship.',
                'image: ghcr.io/example/app:1.2.3',
                '# or',
                'image: ghcr.io/example/app@sha256:0123456789abcdef',
              ].join("\n"),
            },
          }),
        ];
      }),
    );
  },
};

function getMutableImageReason(image: string) {
  if (image.includes("@")) {
    return undefined;
  }

  const lastSlash = image.lastIndexOf("/");
  const lastColon = image.lastIndexOf(":");

  if (lastColon <= lastSlash) {
    return "without an explicit tag or digest";
  }

  const tag = image.slice(lastColon + 1);
  return tag === "latest" ? 'with the mutable ":latest" tag' : undefined;
}
