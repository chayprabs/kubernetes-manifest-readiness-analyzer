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
    status: "Live",
    seoTitle:
      "Kubernetes Manifest Analyzer - Production Readiness YAML Checker | Authos",
    seoDescription:
      "Analyze Kubernetes YAML locally for probes, resource limits, security context, service selectors, exposure risks, and readiness gaps before production deploys.",
    relatedToolIds: [
      "helm-values-checker",
      "kustomize-output-diff",
      "networkpolicy-reviewer",
    ],
  },
  {
    id: "helm-values-checker",
    name: "Kubernetes Helm Values Checker",
    shortName: "Helm Values",
    slug: "/tools/helm-values-checker" as Route,
    category: "Kubernetes and DevOps",
    description:
      "Review Helm values.yaml locally for risky image tags, missing resources, plaintext secrets, and insecure security defaults before chart rendering.",
    shortDescription:
      "Check Helm values files for production risks before you render or promote a chart.",
    tags: ["Helm", "values.yaml", "Kubernetes", "DevOps", "chart review"],
    audiences: ["Platform engineers", "Release engineers", "SRE teams"],
    status: "Live",
    seoTitle: "Helm Values Checker - Review values.yaml Locally | Authos",
    seoDescription:
      "Review Helm values.yaml for mutable image tags, missing resources, plaintext secrets, and insecure defaults before release.",
    relatedToolIds: [
      "kubernetes-manifest-analyzer",
      "kustomize-output-diff",
      "networkpolicy-reviewer",
    ],
  },
  {
    id: "kustomize-output-diff",
    name: "Kustomize Output Diff Reviewer",
    shortName: "Kustomize Diff",
    slug: "/tools/kustomize-output-diff" as Route,
    category: "Kubernetes and DevOps",
    description:
      "Compare rendered Kustomize manifest output between overlays locally to see added, removed, and changed resources before promotion.",
    shortDescription:
      "Diff two rendered Kustomize bundles locally without claiming live cluster drift analysis.",
    tags: ["Kustomize", "diff", "Kubernetes", "overlays", "GitOps"],
    audiences: ["Platform engineers", "GitOps teams", "SRE teams"],
    status: "Live",
    seoTitle: "Kustomize Output Diff Reviewer | Authos",
    seoDescription:
      "Compare rendered Kustomize YAML output between overlays and review added, removed, and changed Kubernetes resources locally.",
    relatedToolIds: [
      "kubernetes-manifest-analyzer",
      "helm-values-checker",
      "networkpolicy-reviewer",
    ],
  },
  {
    id: "networkpolicy-reviewer",
    name: "NetworkPolicy Builder and Reviewer",
    shortName: "NetPol Review",
    slug: "/tools/networkpolicy-reviewer" as Route,
    category: "Kubernetes and DevOps",
    description:
      "Review NetworkPolicy manifests locally for open egress, broad ingress CIDRs, empty pod selectors, and missing default-deny posture.",
    shortDescription:
      "Review allowlists carefully with warnings around default-deny traffic breakage.",
    tags: ["NetworkPolicy", "Kubernetes", "security", "traffic policy"],
    audiences: ["Platform engineers", "Security engineers", "SRE teams"],
    status: "Live",
    seoTitle: "NetworkPolicy Reviewer - Local YAML Review | Authos",
    seoDescription:
      "Review Kubernetes NetworkPolicy YAML locally for risky allowlists, open egress, and namespace posture gaps.",
    relatedToolIds: [
      "kubernetes-manifest-analyzer",
      "helm-values-checker",
      "kustomize-output-diff",
    ],
  },
];

export const tools = toolRegistry;

export function getFeaturedTools(
  limit = toolRegistry.length,
): ToolDefinition[] {
  return toolRegistry.slice(0, limit);
}

export function getLiveTools() {
  return toolRegistry.filter(
    (tool) => tool.status.trim().toLowerCase() === "live",
  );
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
