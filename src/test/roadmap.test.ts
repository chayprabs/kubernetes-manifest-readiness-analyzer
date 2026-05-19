import { describe, expect, it } from "vitest";
import { getRoadmapTools } from "@/lib/tools/roadmap";

describe("authos roadmap", () => {
  it("is empty at 1.0 because follow-on tools shipped live", () => {
    expect(getRoadmapTools()).toEqual([]);
  });
});
