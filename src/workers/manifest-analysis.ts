import { analyzeManifestText } from "@/lib/k8s/analyzer";
import type { K8sFinding } from "@/lib/k8s/types";

export type ManifestAnalysisTask = {
  manifest: string;
};

export type ManifestAnalysisResult = {
  findings: K8sFinding[];
};

export function executeManifestAnalysis(
  task: ManifestAnalysisTask,
): ManifestAnalysisResult {
  return {
    findings: analyzeManifestText(task.manifest),
  };
}
