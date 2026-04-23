import type { MetadataRoute } from "next";
import { getCanonicalUrl, siteMetadataBase } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    host: siteMetadataBase.host,
    sitemap: getCanonicalUrl("/sitemap.xml"),
  };
}
