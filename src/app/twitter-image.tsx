import {
  createAuthosSocialImage,
  socialImageContentType,
  socialImageSize,
} from "@/lib/seo/social-image";

export const alt =
  "Authos social card promoting the local Kubernetes Manifest Analyzer.";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function TwitterImage() {
  return createAuthosSocialImage({
    eyebrow: "Launch product",
    title: "Kubernetes Manifest Analyzer",
    description:
      "Local browser analysis for production-readiness, security, networking, and redacted report exports.",
    footer: "No backend required for the core analyzer",
  });
}
