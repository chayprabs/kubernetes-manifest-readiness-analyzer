import type { ReactNode } from "react";
import { AppTopbar } from "@/components/layout/app-topbar";
import { MinimalFooter } from "@/components/layout/minimal-footer";
import { SeoStrip } from "@/components/layout/seo-strip";

type AppShellProps = {
  children: ReactNode;
  showSeoStrip?: boolean;
};

export function AppShell({ children, showSeoStrip = true }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <AppTopbar />
      {showSeoStrip ? <SeoStrip /> : null}
      <div className="flex-1">{children}</div>
      <MinimalFooter />
    </div>
  );
}
