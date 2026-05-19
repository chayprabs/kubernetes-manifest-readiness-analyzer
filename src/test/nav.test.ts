import { describe, expect, it } from "vitest";
import { getPrimaryNavLinks } from "@/lib/tools/nav";

describe("getPrimaryNavLinks", () => {
  it("includes catalog, every live registry tool, and privacy", () => {
    const links = getPrimaryNavLinks();

    expect(links.map((link) => link.href)).toEqual([
      "/tools",
      "/tools/kubernetes-manifest-analyzer",
      "/tools/helm-values-checker",
      "/tools/kustomize-output-diff",
      "/tools/networkpolicy-reviewer",
      "/privacy",
    ]);
  });
});
