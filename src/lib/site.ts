import type { Metadata } from "next";

const siteUrlPlaceholder = "https://k8s-readiness.example";

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function normalizeSitePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export const siteConfig = {
  name: "K8s Readiness",
  shortTagline: "Browser-first Kubernetes review tools",
  mission:
    "Review Kubernetes manifests, Helm values, overlay diffs, and NetworkPolicies locally before you ship.",
  description:
    "K8s Readiness is a browser-first suite for Kubernetes production-readiness checks. Analyze YAML locally with no backend upload.",
  githubUrl:
    "https://github.com/chayprabs/kubernetes-manifest-readiness-analyzer",
  twitterUrl: "https://x.com/chayprabs",
  websiteUrl: "https://www.chaitanyaprabuddha.com",
  seoStripLine1:
    "Analyze Kubernetes manifests, Helm values, Kustomize output, and NetworkPolicies in your browser.",
  seoStripLine2:
    "No account, no cluster connection, and no upload of your YAML to a server.",
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
  title: "K8s Readiness | Local Kubernetes review tools",
  description: siteConfig.description,
  path: "/",
});

export const privacyMetadata: Metadata = createPageMetadata({
  title: "Privacy Policy | K8s Readiness",
  description:
    "How K8s Readiness processes data locally in your browser, what may be stored on your device, and what is not collected by default.",
  path: "/privacy",
});

export const termsMetadata: Metadata = createPageMetadata({
  title: "Terms of Use | K8s Readiness",
  description:
    "Terms governing use of the K8s Readiness browser-based Kubernetes review tools.",
  path: "/terms",
});
