import type { MetadataRoute } from "next";
import { getCanonicalUrl } from "@/lib/site";
import { tools } from "@/lib/tools/registry";

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
    path: "/privacy",
    changeFrequency: "monthly" as const,
    priority: 0.5,
  },
] as const;

const toolEntries = tools.map((tool) => ({
  path: tool.slug,
  changeFrequency: "weekly" as const,
  priority: 0.9,
}));

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-04-23T00:00:00.000Z");

  return [...sitemapEntries, ...toolEntries].map((entry) => ({
    url: getCanonicalUrl(entry.path),
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
