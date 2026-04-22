import type { Metadata } from "next";

export const siteConfig = {
  name: "Authos",
  shortTagline: "Browser-first developer tools",
  mission:
    "A clean foundation for browser-first developer tools that can scale into a multi-tool website.",
  description:
    "Authos is a collection of browser-first developer tools built for practical engineering workflows.",
} as const;

export const homeMetadata: Metadata = {
  title: { absolute: "Authos | Browser-first developer tools" },
  description:
    "Authos is a collection of browser-first developer tools for infrastructure and application teams, starting with the Kubernetes Manifest Production-Readiness Analyzer.",
};

export const toolsMetadata: Metadata = {
  title: { absolute: "Authos Tools" },
  description:
    "Explore the Authos tool catalog and discover browser-first utilities for practical engineering workflows.",
};

export const privacyMetadata: Metadata = {
  title: { absolute: "Authos Privacy" },
  description:
    "Learn how Authos approaches privacy and local browser processing for core tools whenever possible.",
};
