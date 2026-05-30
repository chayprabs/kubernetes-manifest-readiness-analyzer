import type { Route } from "next";

export type RoadmapToolStatus = "planned";

export type RoadmapTool = {
  id: string;
  title: string;
  description: string;
  href: Route | `${Route}#${string}`;
  priority: number;
  status: RoadmapToolStatus;
};

/** Shipped tools live in the registry. Roadmap is empty at initial launch. */
export const productRoadmapTools: readonly RoadmapTool[] = [] as const;

export function getRoadmapTools() {
  return [...productRoadmapTools].sort(
    (left, right) => left.priority - right.priority,
  );
}

/** @deprecated Use `getRoadmapTools()` */
export const k8sAnalyzerComingSoonTools = productRoadmapTools;
