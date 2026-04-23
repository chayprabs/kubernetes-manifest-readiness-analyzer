import type { Metadata } from "next";

const siteUrlPlaceholder = "https://authos.example";

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function normalizeSitePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export const siteConfig = {
  name: "Authos",
  shortTagline: "Browser-first developer tools",
  mission:
    "Browser-first tools that help engineering teams review risky changes before they ship.",
  description:
    "Authos builds browser-first developer tools for practical engineering workflows, starting with local Kubernetes manifest analysis and remediation guidance.",
  baseUrl: normalizeBaseUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? siteUrlPlaceholder,
  ),
} as const;

export const siteMetadataBase = new URL(siteConfig.baseUrl);

export function getCanonicalUrl(path = "/") {
  return new URL(normalizeSitePath(path), siteMetadataBase).toString();
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  openGraphTitle?: string;
  openGraphDescription?: string;
};

export function createPageMetadata({
  title,
  description,
  path,
  keywords,
  openGraphTitle,
  openGraphDescription,
}: PageMetadataOptions): Metadata {
  const canonicalUrl = getCanonicalUrl(path);
  const resolvedOpenGraphTitle = openGraphTitle ?? title;
  const resolvedOpenGraphDescription = openGraphDescription ?? description;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      url: canonicalUrl,
      title: resolvedOpenGraphTitle,
      description: resolvedOpenGraphDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedOpenGraphTitle,
      description: resolvedOpenGraphDescription,
    },
    keywords,
  };
}

export const homeMetadata: Metadata = createPageMetadata({
  title: "Authos | Browser-first developer tools",
  description:
    "Authos builds browser-first developer tools for infrastructure and application teams, starting with a local Kubernetes manifest analyzer and YAML checker.",
  path: "/",
});

export const toolsMetadata: Metadata = createPageMetadata({
  title: "Authos Tools",
  description:
    "Explore the Authos tool catalog, including the local Kubernetes manifest analyzer and future browser-first utilities for engineering teams.",
  path: "/tools",
});

export const privacyMetadata: Metadata = createPageMetadata({
  title: "Authos Privacy",
  description:
    "Learn how Authos keeps Kubernetes manifest analysis local-first, excludes raw YAML from exports by default, and avoids sending manifest content to telemetry.",
  path: "/privacy",
});
