import { parseK8sYaml } from "@/lib/k8s/parser";
import { extractK8sResources } from "@/lib/k8s/resources";
import type { NetpolResource } from "@/lib/netpol-review/types";

export function extractNetpolBundle(raw: string) {
  const parseResult = parseK8sYaml(raw);
  const resources = extractK8sResources(parseResult.documents);
  const workloads = resources.filter((resource) => resource.category === "workload");

  const policies: NetpolResource[] = parseResult.documents
    .filter((document) => document.kind === "NetworkPolicy" && document.metadata.name)
    .map((document) => {
      const namespace = document.metadata.namespace ?? "default";
      const name = document.metadata.name!;

      return {
        id: `NetworkPolicy/${name}/${namespace}`,
        name,
        namespace,
        ref: `NetworkPolicy/${name} (${namespace})`,
        record: document.raw,
      };
    });

  return {
    parseResult,
    policies,
    workloadCount: workloads.length,
  };
}
