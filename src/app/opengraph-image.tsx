import {
  createK8s ReadinessSocialImage,
  socialImageContentType,
  socialImageSize,
} from "@/lib/seo/social-image";

export const alt =
  "K8s Readiness social card with the Kubernetes Manifest Analyzer highlighted as the launch product.";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function OpenGraphImage() {
  return createK8s ReadinessSocialImage({
    eyebrow: "Browser-first developer tools",
    title: "K8s Readiness launches with a local Kubernetes Manifest Analyzer",
    description:
      "Review probes, resources, security context, selectors, and exposure risks without a backend roundtrip.",
    footer: "Launch product: Kubernetes manifest production-readiness review",
  });
}
