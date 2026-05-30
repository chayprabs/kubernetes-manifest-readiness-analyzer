import {
  createK8sReadinessSocialImage,
  socialImageContentType,
  socialImageSize,
} from "@/lib/seo/social-image";

export const alt =
  "K8s Readiness social card promoting the local Kubernetes Manifest Analyzer.";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function TwitterImage() {
  return createK8sReadinessSocialImage({
    eyebrow: "Launch product",
    title: "Kubernetes Manifest Analyzer",
    description:
      "Local browser analysis for production-readiness, security, networking, and redacted report exports.",
    footer: "No backend required for the core analyzer",
  });
}
