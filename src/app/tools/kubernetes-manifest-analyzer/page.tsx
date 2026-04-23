import type { Metadata } from "next";
import { K8sAnalyzerApp } from "@/components/tool/k8s-analyzer-app";
import { getToolMetadata } from "@/lib/tools/registry";

export const metadata: Metadata = getToolMetadata(
  "kubernetes-manifest-analyzer",
);

export default function KubernetesManifestAnalyzerPage() {
  return <K8sAnalyzerApp />;
}
