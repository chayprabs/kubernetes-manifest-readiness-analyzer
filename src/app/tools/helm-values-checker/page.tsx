import type { Metadata } from "next";
import { HelmValuesApp } from "@/components/tool/helm-values-app";
import { getToolMetadata } from "@/lib/tools/registry";

export const metadata: Metadata = getToolMetadata("helm-values-checker");

export default function HelmValuesCheckerPage() {
  return <HelmValuesApp />;
}
