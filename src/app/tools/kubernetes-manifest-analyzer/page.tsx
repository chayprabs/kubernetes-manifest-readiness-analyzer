import type { Metadata } from "next";
import { ManifestAnalyzerShell } from "@/components/tool/manifest-analyzer-shell";
import { getToolMetadata } from "@/lib/tools/registry";

export const metadata: Metadata = getToolMetadata(
  "kubernetes-manifest-analyzer",
);

export default function KubernetesManifestAnalyzerPage() {
  return <ManifestAnalyzerShell />;
}
