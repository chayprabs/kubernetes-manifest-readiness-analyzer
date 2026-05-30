import Link from "next/link";
import type { Route } from "next";

export function MinimalFooter() {
  return (
    <footer className="border-border mt-auto border-t">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-6 px-4 py-6 text-sm sm:px-6">
        <Link
          href="/privacy"
          className="text-muted hover:text-foreground transition"
        >
          Privacy Policy
        </Link>
        <Link
          href={"/terms" as Route}
          className="text-muted hover:text-foreground transition"
        >
          Terms &amp; Conditions
        </Link>
      </div>
    </footer>
  );
}
