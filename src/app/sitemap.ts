import type { MetadataRoute } from "next";
import { kubernetesManifestAnalyzerPath } from "@/lib/k8s/landing-content";
import { getCanonicalUrl } from "@/lib/site";

const sitemapEntries = [
  {
    path: "/",
    changeFrequency: "weekly" as const,
    priority: 1,
  },
  {
    path: "/tools",
    changeFrequency: "weekly" as const,
    priority: 0.9,
  },
  {
    path: kubernetesManifestAnalyzerPath,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  },
  {
    path: "/privacy",
    changeFrequency: "monthly" as const,
    priority: 0.5,
  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return sitemapEntries.map((entry) => ({
    url: getCanonicalUrl(entry.path),
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
