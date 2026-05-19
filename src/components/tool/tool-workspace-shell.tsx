import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { LocalOnlyNotice } from "@/components/tool/local-only-notice";

type ToolWorkspaceShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function ToolWorkspaceShell({
  title,
  description,
  children,
  footer,
}: ToolWorkspaceShellProps) {
  return (
    <Container size="workspace" className="space-y-8 pb-12">
      <div className="space-y-3">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="text-muted max-w-3xl text-base leading-7">{description}</p>
        <LocalOnlyNotice />
      </div>
      {children}
      {footer}
    </Container>
  );
}
