import Link from "next/link";
import { Globe } from "lucide-react";
import { siteConfig } from "@/lib/site";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-3.795-.735-.405-1.03-1.005-1.305-1.005-1.305-.825-.57.03-.555.03-.555.9.03 1.365 1.23 1.365 1.23.81 1.395 2.115.99 2.625.765.09-.6.315-.99.57-1.215-2.4-.27-4.92-1.2-4.92-5.355 0-1.185.42-2.145 1.125-2.895-.12-.27-.495-1.335.105-2.775 0 0 .93-.3 3.045 1.11.885-.24 1.83-.36 2.775-.36.945 0 1.89.12 2.775.36 2.115-1.425 3.045-1.11 3.045-1.11.6 1.44.225 2.505.105 2.775.705.75 1.125 1.71 1.125 2.895 0 4.17-2.52 5.085-4.92 5.355.39.33.735.945.735 1.92 0 1.385-.015 2.505-.015 2.85 0 .285.225.675.84.57A8.205 8.205 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

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
            <GitHubIcon className="h-4 w-4" />
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
