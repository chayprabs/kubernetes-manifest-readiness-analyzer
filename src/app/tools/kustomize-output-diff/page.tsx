import type { Metadata } from "next";
import { KustomizeDiffApp } from "@/components/tool/kustomize-diff-app";
import { getToolMetadata } from "@/lib/tools/registry";

export const metadata: Metadata = getToolMetadata("kustomize-output-diff");

export default function KustomizeOutputDiffPage() {
  return <KustomizeDiffApp />;
}
