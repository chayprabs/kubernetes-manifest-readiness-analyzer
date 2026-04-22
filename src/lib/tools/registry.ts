import type { Metadata } from "next";
import type { Route } from "next";

export type ToolDefinition = {
  id: string;
  name: string;
  shortName: string;
  slug: Route;
  category: string;
  description: string;
  shortDescription: string;
  tags: string[];
  audiences: string[];
  status: string;
  seoTitle: string;
  seoDescription: string;
  relatedToolIds: string[];
};

export const toolRegistry: ToolDefinition[] = [
  {
    id: "kubernetes-manifest-analyzer",
    name: "Kubernetes Manifest Production-Readiness Analyzer",
    shortName: "K8s Readiness Analyzer",
    slug: "/tools/kubernetes-manifest-analyzer",
    category: "Kubernetes and DevOps",
    description:
      "Review Kubernetes YAML manifests for production-readiness signals such as resources, health probes, non-root execution, and safer deployment defaults with a browser-first experience.",
    shortDescription:
      "Analyze Kubernetes manifests for production-readiness signals with a browser-first workflow.",
    tags: [
      "Kubernetes",
      "YAML",
      "DevOps",
      "SRE",
      "production readiness",
      "security",
      "probes",
      "resources",
    ],
    audiences: [
      "Platform engineers",
      "SRE teams",
      "Application developers shipping to Kubernetes",
    ],
    status: "Foundational",
    seoTitle: "Kubernetes Manifest Production-Readiness Analyzer | Authos",
    seoDescription:
      "Authos helps teams review Kubernetes manifests for production-readiness with browser-first checks for probes, resources, and safer runtime defaults.",
    relatedToolIds: [],
  },
];

export const tools = toolRegistry;

export function getFeaturedTools(
  limit = toolRegistry.length,
): ToolDefinition[] {
  return toolRegistry.slice(0, limit);
}

export function getToolById(id: string): ToolDefinition {
  const tool = toolRegistry.find((entry) => entry.id === id);

  if (!tool) {
    throw new Error(`Unknown tool id: ${id}`);
  }

  return tool;
}

export function getToolBySlug(slug: Route): ToolDefinition {
  const tool = toolRegistry.find((entry) => entry.slug === slug);

  if (!tool) {
    throw new Error(`Unknown tool slug: ${slug}`);
  }

  return tool;
}

export function getToolMetadata(id: string): Metadata {
  const tool = getToolById(id);

  return {
    title: { absolute: tool.seoTitle },
    description: tool.seoDescription,
    keywords: [tool.category, ...tool.tags, ...tool.audiences],
  };
}
