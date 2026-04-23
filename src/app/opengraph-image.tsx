import {
  createAuthosSocialImage,
  socialImageContentType,
  socialImageSize,
} from "@/lib/seo/social-image";

export const alt =
  "Authos social card with the Kubernetes Manifest Analyzer highlighted as the launch product.";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function OpenGraphImage() {
  return createAuthosSocialImage({
    eyebrow: "Browser-first developer tools",
    title: "Authos launches with a local Kubernetes Manifest Analyzer",
    description:
      "Review probes, resources, security context, selectors, and exposure risks without a backend roundtrip.",
    footer: "Launch product: Kubernetes manifest production-readiness review",
  });
}
