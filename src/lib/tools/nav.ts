import type { Route } from "next";
import { toolRegistry } from "@/lib/tools/registry";

export type PrimaryNavLink = {
  href: Route;
  label: string;
};

function isLiveTool(status: string) {
  return status.trim().toLowerCase() === "live";
}

/**
 * Primary navigation links for the site shell.
 * Live tools are derived from the registry; catalog and privacy are fixed anchors.
 */
export function getPrimaryNavLinks(): PrimaryNavLink[] {
  const catalog: PrimaryNavLink = { href: "/tools", label: "Tools" };
  const liveTools = toolRegistry
    .filter((tool) => isLiveTool(tool.status))
    .map((tool) => ({
      href: tool.slug,
      label: tool.shortName,
    }));
  const privacy: PrimaryNavLink = { href: "/privacy", label: "Privacy" };

  return [catalog, ...liveTools, privacy];
}
