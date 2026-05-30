import { siteConfig } from "@/lib/site";

export function SeoStrip() {
  return (
    <div
      className="border-border bg-background-muted/60 border-b"
      role="region"
      aria-label="Product summary"
    >
      <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6">
        <p className="text-foreground text-center text-sm leading-relaxed sm:text-[0.9375rem]">
          {siteConfig.seoStripLine1}
        </p>
        <p className="text-muted mt-1 text-center text-sm leading-relaxed">
          {siteConfig.seoStripLine2}
        </p>
      </div>
    </div>
  );
}
