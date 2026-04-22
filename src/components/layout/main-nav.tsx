"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getToolById } from "@/lib/tools/registry";

const kubernetesAnalyzer = getToolById("kubernetes-manifest-analyzer");

const navLinks = [
  { href: "/tools", label: "Tools" },
  { href: kubernetesAnalyzer.slug, label: kubernetesAnalyzer.shortName },
  { href: "/privacy", label: "Privacy" },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden items-center gap-2 md:flex">
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "focus-visible:ring-accent focus-visible:ring-offset-background rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            pathname === link.href
              ? "bg-accent-soft text-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
