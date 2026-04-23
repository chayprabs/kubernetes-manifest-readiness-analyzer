import { buildLargeK8sBundle } from "@/lib/k8s/performance-fixture";

export const generatedPerformanceManifest = buildLargeK8sBundle({
  workloadCount: 320,
  namespace: "performance-lab",
});
