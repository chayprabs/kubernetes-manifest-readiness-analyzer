"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <>
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 md:hidden">
          <DropdownMenuLabel>Navigate</DropdownMenuLabel>
          {navLinks.map((link) => (
            <DropdownMenuItem asChild key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "flex w-full items-center justify-between",
                  pathname === link.href && "text-foreground font-medium",
                )}
              >
                <span>{link.label}</span>
                {pathname === link.href ? (
                  <span className="text-muted text-xs">Current</span>
                ) : null}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
