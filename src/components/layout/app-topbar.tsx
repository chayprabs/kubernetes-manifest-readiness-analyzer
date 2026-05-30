import Link from "next/link";
import { Github, Globe } from "lucide-react";
import { siteConfig } from "@/lib/site";

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const externalLinkClass =
  "text-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function AppTopbar() {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-30 border-b">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-foreground text-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {siteConfig.name}
        </Link>
        <nav
          aria-label="External links"
          className="flex flex-wrap items-center justify-end gap-1 sm:gap-2"
        >
          <a
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={externalLinkClass}
          >
            <Github className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">GitHub</span>
            <span className="sr-only sm:hidden">GitHub repository</span>
          </a>
          <a
            href={siteConfig.twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={externalLinkClass}
          >
            <XIcon className="h-4 w-4" />
            <span className="hidden sm:inline">X</span>
            <span className="sr-only sm:hidden">X profile</span>
          </a>
          <a
            href={siteConfig.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={externalLinkClass}
          >
            <Globe className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Website</span>
            <span className="sr-only sm:hidden">Personal website</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
