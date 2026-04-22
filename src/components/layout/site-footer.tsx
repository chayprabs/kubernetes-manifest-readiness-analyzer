import Link from "next/link";
import { Container } from "@/components/layout/container";

export function SiteFooter() {
  return (
    <footer className="border-border/80 bg-background/80 border-t">
      <Container
        size="workspace"
        className="text-muted flex flex-col gap-4 py-8 text-sm md:flex-row md:items-center md:justify-between"
      >
        <div className="max-w-2xl space-y-2">
          <p className="text-foreground font-medium">Authos</p>
          <p>
            Core tools are designed to run locally in your browser whenever
            possible.
          </p>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/tools" className="hover:text-foreground transition">
            Tools
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition">
            Privacy
          </Link>
        </div>
      </Container>
    </footer>
  );
}
