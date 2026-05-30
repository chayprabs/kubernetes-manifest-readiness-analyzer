import type { MetadataRoute } from "next";
import { getCanonicalUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: getCanonicalUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: getCanonicalUrl("/privacy"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: getCanonicalUrl("/terms"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
