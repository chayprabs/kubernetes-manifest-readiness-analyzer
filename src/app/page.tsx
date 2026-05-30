import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ToolSuite } from "@/components/home/tool-suite";
import { homeMetadata } from "@/lib/site";

export const metadata: Metadata = homeMetadata;

export default function Home() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="text-muted flex min-h-[400px] items-center justify-center text-sm">
            Loading tools…
          </div>
        }
      >
        <ToolSuite />
      </Suspense>
    </AppShell>
  );
}
