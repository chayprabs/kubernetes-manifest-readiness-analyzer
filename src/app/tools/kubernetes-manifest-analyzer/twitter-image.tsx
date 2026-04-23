import {
  createAuthosSocialImage,
  socialImageContentType,
  socialImageSize,
} from "@/lib/seo/social-image";

export const alt =
  "Twitter card for the Authos Kubernetes Manifest Analyzer.";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function TwitterImage() {
  return createAuthosSocialImage({
    eyebrow: "Authos",
    title: "Kubernetes Manifest Analyzer",
    description:
      "Local manifest review for probes, resources, security context, service selectors, and exposure risks.",
    footer: "Static review only; verify against cluster policy before deploy",
  });
}
