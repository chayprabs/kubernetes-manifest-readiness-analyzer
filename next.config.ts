import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  reactStrictMode: true,
  typedRoutes: true,
  async redirects() {
    return [
      {
        source: "/tools",
        destination: "/",
        permanent: true,
      },
      {
        source: "/tools/kubernetes-manifest-analyzer",
        destination: "/",
        permanent: false,
      },
      {
        source: "/tools/helm-values-checker",
        destination: "/?tool=helm-values-checker",
        permanent: false,
      },
      {
        source: "/tools/kustomize-output-diff",
        destination: "/?tool=kustomize-output-diff",
        permanent: false,
      },
      {
        source: "/tools/networkpolicy-reviewer",
        destination: "/?tool=networkpolicy-reviewer",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
