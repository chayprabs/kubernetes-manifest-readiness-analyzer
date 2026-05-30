"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { K8sAnalyzerApp } from "@/components/tool/k8s-analyzer-app";
import { HelmValuesApp } from "@/components/tool/helm-values-app";
import { KustomizeDiffApp } from "@/components/tool/kustomize-diff-app";
import { NetpolReviewApp } from "@/components/tool/netpol-review-app";
import { toolRegistry } from "@/lib/tools/registry";
import { cn } from "@/lib/utils";

const TOOL_COMPONENTS = {
  "kubernetes-manifest-analyzer": K8sAnalyzerApp,
  "helm-values-checker": HelmValuesApp,
  "kustomize-output-diff": KustomizeDiffApp,
  "networkpolicy-reviewer": NetpolReviewApp,
} as const;

type ToolId = keyof typeof TOOL_COMPONENTS;

function isToolId(value: string | null): value is ToolId {
  return value !== null && value in TOOL_COMPONENTS;
}

export function ToolSuite() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toolParam = searchParams.get("tool");
  const activeId: ToolId = isToolId(toolParam)
    ? toolParam
    : "kubernetes-manifest-analyzer";

  const setActiveTool = useCallback(
    (id: ToolId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === "kubernetes-manifest-analyzer") {
        params.delete("tool");
      } else {
        params.set("tool", id);
      }
      const query = params.toString();
      router.replace(query ? `/?${query}` : "/", { scroll: false });
    },
    [router, searchParams],
  );

  const ActiveTool = TOOL_COMPONENTS[activeId];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6">
      <div
        role="tablist"
        aria-label="Kubernetes review tools"
        className="border-border mb-4 flex flex-wrap gap-1 rounded-xl border bg-zinc-50 p-1"
      >
        {toolRegistry.map((tool) => {
          const selected = tool.id === activeId;
          return (
            <button
              key={tool.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`tool-tab-${tool.id}`}
              aria-controls={`tool-panel-${tool.id}`}
              onClick={() => setActiveTool(tool.id as ToolId)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                selected
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              {tool.shortName}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`tool-panel-${activeId}`}
        aria-labelledby={`tool-tab-${activeId}`}
      >
        <ActiveTool embedded />
      </div>
    </div>
  );
}
