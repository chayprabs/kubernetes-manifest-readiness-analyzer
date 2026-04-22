import { describe, expect, it } from "vitest";
import { getToolById, getToolMetadata, tools } from "@/lib/tools/registry";

describe("tool registry", () => {
  it("registers the Kubernetes analyzer as the first tool", () => {
    const firstTool = tools[0];

    if (!firstTool) {
      throw new Error("Expected at least one tool in the registry.");
    }

    expect(firstTool.id).toBe("kubernetes-manifest-analyzer");
    expect(firstTool.slug).toBe("/tools/kubernetes-manifest-analyzer");
  });

  it("derives metadata from the tool definition", () => {
    const tool = getToolById("kubernetes-manifest-analyzer");
    const metadata = getToolMetadata(tool.id);

    expect(metadata.description).toBe(tool.seoDescription);
    expect(metadata.title).toEqual({ absolute: tool.seoTitle });
  });
});
