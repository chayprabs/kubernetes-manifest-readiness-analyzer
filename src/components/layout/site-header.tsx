import Link from "next/link";
import { Container } from "@/components/layout/container";
import { MainNav } from "@/components/layout/main-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="border-border/80 bg-background/90 sticky top-0 z-20 border-b backdrop-blur-xl">
      <Container
        size="workspace"
        className="flex items-center justify-between gap-6 py-4"
      >
        <Link
          href="/"
          className="focus-visible:ring-accent focus-visible:ring-offset-background flex items-center gap-3 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <div className="bg-foreground text-background flex h-10 w-10 items-center justify-center rounded-xl font-mono text-sm font-semibold">
            AU
          </div>
          <div>
            <p className="text-foreground font-mono text-xs tracking-[0.22em] uppercase">
              {siteConfig.name}
            </p>
            <p className="text-muted text-sm">{siteConfig.shortTagline}</p>
          </div>
        </Link>
        <div className="flex flex-1 items-center justify-end gap-6">
          <MainNav />
          <ThemeToggle />
          <div className="hidden min-w-16 lg:block" aria-hidden="true" />
        </div>
      </Container>
    </header>
  );
}
