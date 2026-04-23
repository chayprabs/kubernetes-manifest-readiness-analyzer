import type { Metadata } from "next";
import { K8sAnalyzerApp } from "@/components/tool/k8s-analyzer-app";
import {
  k8sAnalyzerFaqs,
  kubernetesManifestAnalyzerFeatureList,
  kubernetesManifestAnalyzerH1,
  kubernetesManifestAnalyzerKeywords,
  kubernetesManifestAnalyzerMetaDescription,
  kubernetesManifestAnalyzerPath,
  kubernetesManifestAnalyzerTitle,
} from "@/lib/k8s/landing-content";
import { createPageMetadata, getCanonicalUrl, siteConfig } from "@/lib/site";

const canonicalUrl = getCanonicalUrl(kubernetesManifestAnalyzerPath);

export const metadata: Metadata = createPageMetadata({
  title: kubernetesManifestAnalyzerTitle,
  description: kubernetesManifestAnalyzerMetaDescription,
  path: kubernetesManifestAnalyzerPath,
  openGraphTitle: kubernetesManifestAnalyzerTitle,
  openGraphDescription: kubernetesManifestAnalyzerMetaDescription,
  keywords: kubernetesManifestAnalyzerKeywords,
});

const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: kubernetesManifestAnalyzerH1,
  description: kubernetesManifestAnalyzerMetaDescription,
  url: canonicalUrl,
  applicationCategory: "DeveloperApplication",
  browserRequirements: "Requires a modern web browser with JavaScript enabled.",
  operatingSystem: "Any",
  featureList: kubernetesManifestAnalyzerFeatureList,
  provider: {
    "@type": "Organization",
    name: siteConfig.name,
    url: getCanonicalUrl("/"),
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: k8sAnalyzerFaqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: getCanonicalUrl("/"),
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Tools",
      item: getCanonicalUrl("/tools"),
    },
    {
      "@type": "ListItem",
      position: 3,
      name: kubernetesManifestAnalyzerH1,
      item: canonicalUrl,
    },
  ],
};

export default function KubernetesManifestAnalyzerPage() {
  return (
    <>
      <JsonLd data={webApplicationSchema} />
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />
      <K8sAnalyzerApp />
    </>
  );
}

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
