"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { reportClientBoundaryError } from "@/lib/analytics/client";
import { getAnalyticsBrowserLocale } from "@/lib/analytics/events";
import {
  kubernetesManifestAnalyzerPath,
  kubernetesManifestAnalyzerToolId,
} from "@/lib/k8s/landing-content";
import { Container } from "@/components/layout/container";
import { ToolErrorState } from "@/components/tool/tool-error-state";
import { Button } from "@/components/ui/button";

export default function ToolsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    reportClientBoundaryError(error, {
      route: pathname ?? "/tools",
      ...(pathname === kubernetesManifestAnalyzerPath
        ? { toolId: kubernetesManifestAnalyzerToolId }
        : {}),
      browserLocale: getAnalyticsBrowserLocale(),
      digest: error.digest,
    });
  }, [error, pathname]);

  return (
    <Container size="workspace">
      <ToolErrorState
        error={error}
        reset={reset}
        footer={
          <Button asChild variant="outline">
            <Link href="/tools">Back to tools</Link>
          </Button>
        }
      />
    </Container>
  );
}
