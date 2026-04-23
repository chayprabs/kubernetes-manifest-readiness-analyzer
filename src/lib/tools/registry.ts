import type { Metadata } from "next";
import type { Route } from "next";
import { createPageMetadata } from "@/lib/site";

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
    name: "Kubernetes Manifest Analyzer",
    shortName: "K8s Analyzer",
    slug: "/tools/kubernetes-manifest-analyzer",
    category: "Kubernetes and DevOps",
    description:
      "Review Kubernetes YAML manifests for production-readiness risks such as probes, resources, security context, selectors, exposure, and safer deployment defaults with a browser-first experience.",
    shortDescription:
      "Analyze Kubernetes manifests locally for production-readiness, security, networking, and remediation guidance.",
    tags: [
      "Kubernetes",
      "YAML",
      "DevOps",
      "SRE",
      "manifest analyzer",
      "YAML checker",
      "production readiness",
      "security",
      "probes",
      "resources",
      "service selector",
    ],
    audiences: [
      "Platform engineers",
      "SRE teams",
      "Application developers shipping to Kubernetes",
    ],
    status: "Foundational",
    seoTitle:
      "Kubernetes Manifest Analyzer - Production Readiness YAML Checker | Authos",
    seoDescription:
      "Analyze Kubernetes YAML locally for probes, resource limits, security context, service selectors, exposure risks, and readiness gaps before production deploys.",
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

  return createPageMetadata({
    title: tool.seoTitle,
    description: tool.seoDescription,
    path: tool.slug,
    keywords: [tool.category, ...tool.tags, ...tool.audiences],
  });
}
