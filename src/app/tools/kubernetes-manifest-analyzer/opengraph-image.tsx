import {
  createAuthosSocialImage,
  socialImageContentType,
  socialImageSize,
} from "@/lib/seo/social-image";

export const alt =
  "Open Graph card for the Authos Kubernetes Manifest Analyzer.";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function OpenGraphImage() {
  return createAuthosSocialImage({
    eyebrow: "Kubernetes Manifest Analyzer",
    title: "Production-readiness review for Kubernetes YAML",
    description:
      "Analyze probes, resources, security context, selectors, deprecated APIs, and exposure risks locally in the browser.",
    footer: "Redacted exports by default",
  });
}
